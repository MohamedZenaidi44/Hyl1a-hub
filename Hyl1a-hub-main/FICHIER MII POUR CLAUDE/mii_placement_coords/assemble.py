import sys

def load_obj(path):
    verts=[]; faces=[]
    for line in open(path):
        if line.startswith('v '):
            p=line.split()
            verts.append([float(p[1]),float(p[2]),float(p[3])])
        elif line.startswith('f '):
            p=line.split()[1:]
            idx=[int(x.split('/')[0])-1 for x in p]
            faces.append(idx)
    return verts, faces

def write_combined(parts, outpath):
    # parts: list of (verts, faces, offset(x,y,z), color_name)
    with open(outpath,'w') as f:
        vcount=0
        for verts, faces, offset, name in parts:
            f.write(f"o {name}\n")
            for v in verts:
                f.write(f"v {v[0]+offset[0]:.4f} {v[1]+offset[1]:.4f} {v[2]+offset[2]:.4f}\n")
            for fa in faces:
                idxs = [str(i+1+vcount) for i in fa]
                f.write("f " + " ".join(idxs) + "\n")
            vcount += len(verts)

if __name__ == '__main__':
    face_v, face_f = load_obj('/home/claude/mii_parts/face/face_000.obj')
    scalp_v, scalp_f = load_obj('/home/claude/mii_parts/scalp/scalp_000.obj')
    hair_v, hair_f = load_obj('/home/claude/mii_parts/hair/hair_000.obj')
    nose_v, nose_f = load_obj('/home/claude/mii_parts/nose/nose_001.obj')

    nose_glasses_offset = (0.0, 24.5, 26.0)  # from face_000 header

    parts = [
        (face_v, face_f, (0,0,0), 'face'),
        (scalp_v, scalp_f, (0,0,0), 'scalp'),
        (hair_v, hair_f, (0,0,0), 'hair'),
        (nose_v, nose_f, nose_glasses_offset, 'nose'),
    ]
    write_combined(parts, '/home/claude/mii_head_assembled.obj')
    print("done")
