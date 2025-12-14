#!/usr/bin/env python3
import argparse
import shutil
import os

from text_to_3D_retexture import run_pipeline


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    # run_pipeline should return a path to the generated GLB
    glb_path = run_pipeline(args.text, args.image)

    # ensure destination directory exists
    out_dir = os.path.dirname(args.out)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    if glb_path != args.out:
        shutil.copyfile(glb_path, args.out)

    print(args.out)


if __name__ == "__main__":
    main()
