"""Blog alcove — bookshelf against back wall (Phase 5 asset 5.3).

A tall narrow shelving unit standing against the alcove's back wall in
the blog (library) alcove. The blog alcove uses ``translucent`` openness
(violet glass walls), so the bookshelf reads from outside the alcove as
a silhouette through the tinted glass — a literal library on display.

Geometry:

- Vertical brass shelf frame: 4.20 m wide × 4.50 m tall × 0.60 m deep.
- 5 horizontal shelf slabs spanning the frame at heights 0.40, 1.30,
  2.20, 3.10, 4.00 m, each 4.0 m × 0.05 m × 0.55 m.
- 28 brass "book spine" rectangles distributed across the shelves —
  each 0.18 m wide × 0.32 m tall × 0.10 m deep, packed onto the shelves
  with small gaps so they read as books even from a distance.
- Single joined output mesh ``alcove-blog-bookshelf``.

Sits at alcove-local (0, 0, -5.0) — directly against the back wall
(back wall is at z = -6.93 m) so the shelf back is flush with the wall.
Wide enough that books are visible left and right of the central
hologram + mount, framing them.

Run headless::

    blender -b -P blender/scripts/alcoves/blog-bookshelf.py
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

import bpy  # type: ignore[import-not-found]

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from common.export import export_glb, stage_to_public  # noqa: E402

ALCOVE_COLLECTION = "Alcove"
BOOKSHELF_NAME = "alcove-blog-bookshelf"

SHELF_WIDTH = 8.40       # wider than mount (7 m) so books frame the hologram
SHELF_HEIGHT = 7.20      # tall enough to reach the cornice band
SHELF_DEPTH = 0.60

# Vertical posts (frame uprights) — 0.18 × 0.18 m square cross-section.
POST_W = 0.18
POST_D = 0.55

# Horizontal shelves.
SHELF_SLAB_DEPTH = 0.55
SHELF_SLAB_HEIGHT = 0.05
SHELF_LEVELS_Z = (0.60, 1.85, 3.10, 4.35, 5.60, 6.80)

# Books.
BOOK_HEIGHTS = (0.50, 0.58, 0.42, 0.62, 0.48)  # cycled per book
BOOK_DEPTH = 0.18
BOOK_WIDTH_RANGE = (0.18, 0.32)


def _get_or_create_collection(name: str) -> bpy.types.Collection:
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def _move_to_collection(obj: bpy.types.Object, coll: bpy.types.Collection) -> None:
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    coll.objects.link(obj)


def _remove_if_exists(*names: str) -> None:
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)


def _make_box(name: str, w: float, d: float, h: float, x: float, y: float, z: float, bevel_w: float = 0.010) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, d, h)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    bevel = obj.modifiers.new(name="EdgeBevel", type="BEVEL")
    bevel.width = bevel_w
    bevel.segments = 1
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)
    return obj


def _join_pieces(pieces: list[bpy.types.Object], final_name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for p in pieces:
        p.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = final_name
    return joined


def _fill_shelf_with_books(z_shelf_top: float, pieces: list[bpy.types.Object]) -> None:
    """Pack books left-to-right across the shelf. Skip the central 3.0 m
    window so the hologram + mount are not occluded."""
    half_width = SHELF_WIDTH / 2 - POST_W * 1.5
    rng = random.Random(int(z_shelf_top * 1000))
    book_idx = 0

    # Left half: from -half_width to -1.5 m.
    x_cursor = -half_width
    while x_cursor < -1.5:
        w = rng.uniform(*BOOK_WIDTH_RANGE)
        if x_cursor + w > -1.5:
            break
        h = BOOK_HEIGHTS[book_idx % len(BOOK_HEIGHTS)]
        center_x = x_cursor + w / 2
        center_z = z_shelf_top + h / 2 + SHELF_SLAB_HEIGHT / 2
        book = _make_box(
            f"book-l-{book_idx:02d}",
            w * 0.92, BOOK_DEPTH, h, center_x, 0.0, center_z, bevel_w=0.006
        )
        pieces.append(book)
        x_cursor += w + rng.uniform(0.005, 0.015)
        book_idx += 1

    # Right half: from +1.5 m to +half_width.
    x_cursor = 1.5
    while x_cursor < half_width:
        w = rng.uniform(*BOOK_WIDTH_RANGE)
        if x_cursor + w > half_width:
            break
        h = BOOK_HEIGHTS[book_idx % len(BOOK_HEIGHTS)]
        center_x = x_cursor + w / 2
        center_z = z_shelf_top + h / 2 + SHELF_SLAB_HEIGHT / 2
        book = _make_box(
            f"book-r-{book_idx:02d}",
            w * 0.92, BOOK_DEPTH, h, center_x, 0.0, center_z, bevel_w=0.006
        )
        pieces.append(book)
        x_cursor += w + rng.uniform(0.005, 0.015)
        book_idx += 1


def build_bookshelf() -> bpy.types.Object:
    _remove_if_exists(BOOKSHELF_NAME)
    alcove = _get_or_create_collection(ALCOVE_COLLECTION)

    pieces: list[bpy.types.Object] = []

    # Frame backing — a thin slab behind the shelves.
    back = _make_box(
        "shelf-back",
        SHELF_WIDTH, 0.06, SHELF_HEIGHT,
        0.0, 0.30, SHELF_HEIGHT / 2,
    )
    pieces.append(back)

    # Vertical posts at left and right edges.
    half_w = SHELF_WIDTH / 2
    for sign, label in ((-1, "l"), (1, "r")):
        post = _make_box(
            f"shelf-post-{label}",
            POST_W, POST_D, SHELF_HEIGHT,
            sign * (half_w - POST_W / 2), 0.0, SHELF_HEIGHT / 2,
        )
        pieces.append(post)

    # Horizontal shelf slabs.
    for i, z in enumerate(SHELF_LEVELS_Z):
        shelf = _make_box(
            f"shelf-slab-{i}",
            SHELF_WIDTH - POST_W * 2, SHELF_SLAB_DEPTH, SHELF_SLAB_HEIGHT,
            0.0, 0.0, z,
        )
        pieces.append(shelf)

    # Books on each shelf level (except the topmost, which is the cap).
    for z in SHELF_LEVELS_Z[:-1]:
        _fill_shelf_with_books(z, pieces)

    joined = _join_pieces(pieces, BOOKSHELF_NAME)
    _move_to_collection(joined, alcove)
    return joined


def _reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _select_only(*objs: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]


def main() -> None:
    _reset_scene()
    shelf = build_bookshelf()

    _select_only(shelf)
    export_path = export_glb(
        "blender/exports/blog-bookshelf.glb",
        selection_only=True,
    )
    staged = stage_to_public(str(export_path))

    print(f"  bookshelf: verts={len(shelf.data.vertices)} faces={len(shelf.data.polygons)}")
    print(f"  exported  → {export_path}")
    print(f"  staged at → {staged}")


if __name__ == "__main__":
    main()
