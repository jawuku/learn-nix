#!/usr/bin/env python3
"""Generate public/favicon.ico: Nix-blue (#5277C3) rounded square with a
white "N", rendered at 16/32/48px and wrapped as a PNG-compressed ICO
(valid in every modern browser). Pure stdlib — no PIL required."""

import struct
import sys
import zlib
from pathlib import Path


def rounded_rect_sdf(px, py, size, radius):
    """Signed distance to a centered rounded square (negative = inside)."""
    half = size / 2.0
    qx = abs(px - half) - (half - radius)
    qy = abs(py - half) - (half - radius)
    ax, ay = max(qx, 0.0), max(qy, 0.0)
    return min(max(qx, qy), 0.0) + (ax * ax + ay * ay) ** 0.5 - radius


def dist_to_segment(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    t = max(0.0, min(1.0, (wx * vx + wy * vy) / (vx * vx + vy * vy)))
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return (dx * dx + dy * dy) ** 0.5


def letter_n_sdf(px, py, size):
    """Signed distance to a bold 'N' drawn in a centered box (negative = ink)."""
    # Letter box: 22%..78% horizontally, 20%..80% vertically.
    x0, x1 = 0.24 * size, 0.76 * size
    y0, y1 = 0.20 * size, 0.80 * size
    stroke = 0.13 * size
    # Left and right vertical bars.
    left = max(x0 - px, px - (x0 + stroke), y0 - py, py - y1)
    right = max((x1 - stroke) - px, px - x1, y0 - py, py - y1)
    # Diagonal from top of left bar to bottom of right bar.
    diag = dist_to_segment(px, py, x0 + stroke, y0, x1 - stroke, y1) - stroke
    return min(left, right, diag)


def render(size):
    """Return a size x size RGBA byte buffer (anti-aliased, 4x4 supersample)."""
    bg = (0x52, 0x77, 0xC3)  # Nix blue
    fg = (0xFF, 0xFF, 0xFF)  # white letter
    radius = 0.16 * size
    ss = 4
    out = bytearray()
    for y in range(size):
        for x in range(size):
            r = g = b = a = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    px = x + (sx + 0.5) / ss
                    py = y + (sy + 0.5) / ss
                    # Coverage 1 = inside the rounded square.
                    cov = 1.0 if rounded_rect_sdf(px, py, size, radius) <= 0 else 0.0
                    if cov == 0:
                        continue
                    # Ink = letter on top; elsewhere the background shows.
                    ink = 1.0 if letter_n_sdf(px, py, size) <= 0 else 0.0
                    col = fg if ink else bg
                    r += col[0] * cov
                    g += col[1] * cov
                    b += col[2] * cov
                    a += 255.0 * cov
            n = ss * ss
            out += bytes((round(r / n), round(g / n), round(b / n), round(a / n)))
    return bytes(out)


def png_encode(size, rgba):
    """Encode RGBA scanlines as a PNG (stdlib only)."""
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    raw = b""
    stride = size * 4
    for row in range(size):
        raw += b"\x00" + rgba[row * stride : (row + 1) * stride]
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def make_ico(pngs):
    """Wrap PNG entries into an ICO container (PNG-in-ICO, Vista+)."""
    header = struct.pack("<HHH", 0, 1, len(pngs))
    entries = b""
    offset = 6 + 16 * len(pngs)
    for size, data in pngs:
        dim = 0 if size >= 256 else size
        entries += struct.pack(
            "<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset
        )
        offset += len(data)
    return header + entries + b"".join(data for _, data in pngs)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "public/favicon.ico")
    pngs = [(s, png_encode(s, render(s))) for s in (16, 32, 48)]
    out.write_bytes(make_ico(pngs))
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
