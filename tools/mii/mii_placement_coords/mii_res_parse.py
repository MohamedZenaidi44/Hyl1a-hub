import struct, os, sys

SECTION_NAMES = [
 "Goatee models","Hair accessory models","Face models","Scalp models",
 "Glasses canvas models","Hair models","Face canvas models","Nose canvas models",
 "Nose models","Hair accessory textures","Eye textures","Eyebrow textures",
 "Goatee textures","Wrinkle textures","Makeup textures","Glasses textures",
 "Mole textures","Mouth textures","Mustache textures","Nose textures"
]
MODEL_SECTIONS = {0,1,2,3,4,5,6,7,8}
TEXTURE_SECTIONS = set(range(9,20))

def read_u16(d,o): return struct.unpack_from('<H',d,o)[0]
def read_u32(d,o): return struct.unpack_from('<I',d,o)[0]
def read_s16(d,o): return struct.unpack_from('<h',d,o)[0]

def parse_header(data):
    count = read_u16(data,0)
    unk = read_u16(data,2)
    offsets = [read_u32(data,4+4*i) for i in range(count)]
    return count, unk, offsets

def parse_section_header(data, sec_off):
    Y = read_u16(data, sec_off)
    max_size = read_u16(data, sec_off+2)
    items = []
    for i in range(Y):
        bits = read_u32(data, sec_off+4+4*i)
        item_off = bits & 0x3FFFFF
        redir = (bits >> 22) & 0x3FF
        items.append((item_off, redir))
    end_off = read_u32(data, sec_off+4+4*Y)
    content_start = sec_off + 4 + 4*Y + 4
    return Y, max_size, items, end_off, content_start

def get_item_bounds(items, end_off, i):
    off_i, redir = items[i]
    if redir != 0:
        real_i = redir - 1
        off_i = items[real_i][0]
        # find next offset after real_i for length
        # length determined by next distinct offset in the items list (since duplicates=0 size)
        next_off = items[real_i+1][0] if real_i+1 < len(items) else end_off
        return off_i, next_off, real_i
    next_off = items[i+1][0] if i+1 < len(items) else end_off
    return off_i, next_off, i

def parse_model_item(data, base, size, section_idx):
    # handle section-specific prefix
    prefix_len = 0
    if section_idx == 2:
        prefix_len = 0x24
    elif section_idx == 5:
        prefix_len = 0x48
    o = base + prefix_len
    C = read_u16(data, o+0)
    N = read_u16(data, o+2)
    T = read_u16(data, o+4)
    I = read_u16(data, o+6)
    ptr = o+8
    verts = []
    normals = []
    texcoords = []
    has_n = (N == C)
    has_t = (T == C)
    for i in range(C):
        x = read_s16(data, ptr); y = read_s16(data, ptr+2); z = read_s16(data, ptr+4)
        ptr += 6
        vx,vy,vz = x/256.0, y/256.0, z/256.0
        nx=ny=nz=0
        u=v=0
        if has_n:
            nx = read_s16(data, ptr); ny = read_s16(data, ptr+2); nz = read_s16(data, ptr+4)
            ptr += 6
            nx,ny,nz = nx/256.0, ny/256.0, nz/256.0
        if has_t:
            u = read_s16(data, ptr); v = read_s16(data, ptr+2)
            ptr += 4
            u,v = u/8192.0, v/8192.0
        verts.append((vx,vy,vz))
        normals.append((nx,ny,nz))
        texcoords.append((u,v))
    common_n = None
    if N == 1:
        nx = read_s16(data, ptr); ny = read_s16(data, ptr+2); nz = read_s16(data, ptr+4)
        ptr += 6
        common_n = (nx/256.0, ny/256.0, nz/256.0)
    common_t = None
    if T == 1:
        u = read_s16(data, ptr); v = read_s16(data, ptr+2)
        ptr += 4
        common_t = (u/8192.0, v/8192.0)
    indices = []
    if I == 1:
        unk4 = read_u16(data, ptr); ptr+=2
        J = read_u16(data, ptr); ptr+=2
        indices = list(data[ptr:ptr+J])
        ptr += J
    return {
        'verts': verts, 'normals': normals, 'texcoords': texcoords,
        'common_n': common_n, 'common_t': common_t, 'indices': indices,
        'N': N, 'T': T, 'C': C
    }

def export_obj(model, path):
    with open(path,'w') as f:
        for v in model['verts']:
            f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
        has_t = model['T'] in (model['C'],)
        if has_t:
            for t in model['texcoords']:
                f.write(f"vt {t[0]:.4f} {t[1]:.4f}\n")
        idx = model['indices']
        for i in range(0, len(idx)-2, 3):
            a,b,c = idx[i]+1, idx[i+1]+1, idx[i+2]+1
            if has_t:
                f.write(f"f {a}/{a} {b}/{b} {c}/{c}\n")
            else:
                f.write(f"f {a} {b} {c}\n")

if __name__ == '__main__':
    path = sys.argv[1]
    data = open(path,'rb').read()
    count, unk, offsets = parse_header(data)
    print("sections:", count, "unk:", hex(unk))
    for si in range(count):
        sec_off = offsets[si]
        Y, max_size, items, end_off, content_start = parse_section_header(data, sec_off)
        print(f"[{si}] {SECTION_NAMES[si]}: items={Y} max_size={max_size} content_start={hex(content_start)} end_off={hex(end_off)}")

def read_f_from_s16fixed_or_float(data, o):
    # Header coords are stored as float32 per spec (vec3<float>)
    return struct.unpack_from('<f', data, o)[0]

def parse_face_header(data, base):
    hair = tuple(read_f_from_s16fixed_or_float(data, base+4*i) for i in range(3))
    nose_glasses = tuple(read_f_from_s16fixed_or_float(data, base+0x0C+4*i) for i in range(3))
    goatee = tuple(read_f_from_s16fixed_or_float(data, base+0x18+4*i) for i in range(3))
    return {'hair_coord': hair, 'nose_glasses_coord': nose_glasses, 'goatee_coord': goatee}

def parse_hair_header(data, base):
    def v3(off):
        return tuple(read_f_from_s16fixed_or_float(data, base+off+4*i) for i in range(3))
    return {
        'hatA_euler': v3(0x00), 'hatA_coord': v3(0x0C),
        'hatB_euler': v3(0x18), 'hatB_coord': v3(0x24),
        'hatC_euler': v3(0x30), 'hatC_coord': v3(0x3C),
    }
