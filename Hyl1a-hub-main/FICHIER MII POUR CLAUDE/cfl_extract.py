#!/usr/bin/env python3
"""
Extracteur pour CFL_Res.dat (Nintendo 3DS Mii Face Library, title 0004009B00010202)
Format documente par 3dbrew / citra_system_archives (Kinnay, B3n30).

Extrait les 11 sections de textures en PNG.
(Les 9 sections de modeles - hair/body/nose/face meshes - sont un chantier separe,
plus complexe car elles contiennent des maillages avec indices/normales/UV.)
"""

import struct
import os
import sys
from PIL import Image

SECTION_NAMES = [
    'goatee_models', 'hair_accessory_models', 'face_models', 'scalp_models',
    'glasses_canvas_models', 'hair_models', 'face_canvas_models',
    'nose_canvas_models', 'nose_models',
    'hair_accessory_textures', 'eye_textures', 'eyebrow_textures',
    'goatee_textures', 'wrinkle_textures', 'makeup_textures',
    'glasses_textures', 'mole_textures', 'mouth_textures',
    'mustache_textures', 'nose_textures'
]

TEXTURE_SECTIONS = set(range(9, 20))

FORMAT_NAMES = {
    0: 'I4', 1: 'I8', 2: 'A4', 3: 'A8', 4: 'IA4', 5: 'IA8', 6: 'RG8',
    7: 'RGB565', 8: 'RGB8', 9: 'RGB5A1', 10: 'RGBA4', 11: 'RGBA8',
    12: 'ETC1', 13: 'ETC1A4'
}


def next_pow2(n):
    p = 1
    while p < n:
        p *= 2
    return p


# --- Morton (Z-order) tiling used by the PICA200 GPU on 3DS ---
_XLUT = [0x00, 0x01, 0x04, 0x05, 0x10, 0x11, 0x14, 0x15]
_YLUT = [0x00, 0x02, 0x08, 0x0A, 0x20, 0x22, 0x28, 0x2A]


def morton_offset(x, y):
    return _XLUT[x & 7] + _YLUT[y & 7]


def tiled_to_linear_coords(width, height):
    """Yield (dst_x, dst_y, src_pixel_index) for an image stored in 8x8 Morton tiles.
    3DS textures are stored bottom-to-top (V flipped) relative to normal image row order."""
    tiles_per_row = width // 8
    for y in range(height):
        for x in range(width):
            tile_x = x // 8
            tile_y = y // 8
            tile_num = tile_y * tiles_per_row + tile_x
            pix_in_tile = morton_offset(x, y)
            src_index = tile_num * 64 + pix_in_tile
            # flip vertically: 3DS GPU V axis points up
            dst_y = height - 1 - y
            yield x, dst_y, src_index


def decode_texture(data, offset, width, height, fmt):
    mwidth = next_pow2(width)
    mheight = next_pow2(height)
    img = Image.new('RGBA', (width, height))
    px = img.load()

    def get_i4(idx):
        byte = data[offset + idx // 2]
        nib = (byte >> 4) if (idx % 2 == 1) else (byte & 0xF)
        v = nib * 17
        return (v, v, v, 255)

    def get_a4(idx):
        byte = data[offset + idx // 2]
        nib = (byte >> 4) if (idx % 2 == 1) else (byte & 0xF)
        a = nib * 17
        return (255, 255, 255, a)

    def get_ia4(idx):
        byte = data[offset + idx]
        i = (byte & 0xF) * 17
        a = (byte >> 4) * 17
        return (i, i, i, a)

    def get_rgba4(idx):
        val = data[offset + idx * 2] | (data[offset + idx * 2 + 1] << 8)
        r = ((val >> 12) & 0xF) * 17
        g = ((val >> 8) & 0xF) * 17
        b = ((val >> 4) & 0xF) * 17
        a = (val & 0xF) * 17
        return (r, g, b, a)

    def get_rgba8(idx):
        base = offset + idx * 4
        r, g, b, a = data[base], data[base + 1], data[base + 2], data[base + 3]
        return (r, g, b, a)

    def get_rgb565(idx):
        val = data[offset + idx * 2] | (data[offset + idx * 2 + 1] << 8)
        r = ((val >> 11) & 0x1F) * 255 // 31
        g = ((val >> 5) & 0x3F) * 255 // 63
        b = (val & 0x1F) * 255 // 31
        return (r, g, b, 255)

    def get_rgb5a1(idx):
        val = data[offset + idx * 2] | (data[offset + idx * 2 + 1] << 8)
        r = ((val >> 11) & 0x1F) * 255 // 31
        g = ((val >> 6) & 0x1F) * 255 // 31
        b = ((val >> 1) & 0x1F) * 255 // 31
        a = 255 if (val & 1) else 0
        return (r, g, b, a)

    def get_i8(idx):
        v = data[offset + idx]
        return (v, v, v, 255)

    def get_a8(idx):
        v = data[offset + idx]
        return (255, 255, 255, v)

    def get_ia8(idx):
        i = data[offset + idx * 2]
        a = data[offset + idx * 2 + 1]
        return (i, i, i, a)

    def get_rg8(idx):
        r = data[offset + idx * 2]
        g = data[offset + idx * 2 + 1]
        return (r, g, 0, 255)

    def get_rgb8(idx):
        base = offset + idx * 3
        b, g, r = data[base], data[base + 1], data[base + 2]
        return (r, g, b, 255)

    getters = {
        0: get_i4, 1: get_i8, 2: get_a4, 3: get_a8, 4: get_ia4, 5: get_ia8,
        6: get_rg8, 7: get_rgb565, 8: get_rgb8, 9: get_rgb5a1,
        10: get_rgba4, 11: get_rgba8,
    }

    if fmt not in getters:
        return None  # ETC1 / ETC1A4 not implemented (not used in this file)

    getter = getters[fmt]
    for x, y, src_idx in tiled_to_linear_coords(mwidth, mheight):
        if x >= width or y >= height:
            continue
        px[x, y] = getter(src_idx)

    return img


def read_section_header(data, sec_off):
    item_count, max_size = struct.unpack_from('<HH', data, sec_off)
    bitfields = struct.unpack_from('<%dI' % item_count, data, sec_off + 4)
    items = []
    for bf in bitfields:
        item_off = bf & 0x3FFFFF
        redir = (bf >> 22) & 0x3FF
        items.append((item_off, redir))
    header_size = 4 + item_count * 4 + 4
    return header_size, items


def extract_textures(data, offsets, sec_idx, name, out_dir):
    sec_off = offsets[sec_idx]
    hsize, items = read_section_header(data, sec_off)
    base = sec_off + hsize
    section_dir = os.path.join(out_dir, name)
    os.makedirs(section_dir, exist_ok=True)

    count_ok, count_skip = 0, 0
    for i, (item_off, redir) in enumerate(items):
        real_i = i if redir == 0 else (redir - 1)
        real_off, _ = items[real_i]
        abs_off = base + real_off
        if abs_off + 8 > len(data):
            count_skip += 1
            continue
        w, h, mip, fmt, uw, vw = struct.unpack_from('<HHBBBB', data, abs_off)
        if w == 0 or h == 0:
            count_skip += 1
            continue
        img = decode_texture(data, abs_off + 8, w, h, fmt)
        if img is None:
            print(f"  [!] {name} #{i}: format {FORMAT_NAMES.get(fmt, fmt)} non gere, ignore")
            count_skip += 1
            continue
        fname = f"{i:03d}_{w}x{h}_{FORMAT_NAMES.get(fmt, fmt)}.png"
        img.save(os.path.join(section_dir, fname))
        count_ok += 1
    print(f"{name}: {count_ok} textures extraites, {count_skip} ignorees -> {section_dir}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 cfl_extract.py <CFL_Res.dat> [dossier_sortie]")
        sys.exit(1)

    in_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "cfl_out"
    os.makedirs(out_dir, exist_ok=True)

    with open(in_path, 'rb') as f:
        data = f.read()

    count, magic = struct.unpack_from('<HH', data, 0)
    if count != 20:
        print(f"[!] Attention: section count = {count}, attendu 20. Le fichier n'est peut-etre pas le bon format.")
    offsets = list(struct.unpack_from('<%dI' % count, data, 4)) + [len(data)]

    for sec_idx in sorted(TEXTURE_SECTIONS):
        extract_textures(data, offsets, sec_idx, SECTION_NAMES[sec_idx], out_dir)


if __name__ == '__main__':
    main()
