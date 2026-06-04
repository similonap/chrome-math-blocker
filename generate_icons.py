import os
import zlib
import struct

def make_png(width, height, color):
    # Generates a simple solid color PNG
    # color is a tuple (R, G, B)
    # Basic PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data))
    png += ihdr
    
    # IDAT chunk
    # Raw pixel data with filter type byte (0) before each row
    row_data = b''.join(b'\x00' + bytes(color) * width for _ in range(height))
    compressed = zlib.compress(row_data)
    idat_len = len(compressed)
    idat = struct.pack('>I', idat_len) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed))
    png += idat
    
    # IEND chunk
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND'))
    png += iend
    
    return png

def main():
    icons_dir = '/home/slimmii/.gemini/antigravity/scratch/chrome-math-blocker/icons'
    os.makedirs(icons_dir, exist_ok=True)
    
    try:
        from PIL import Image, ImageDraw
        print("PIL (Pillow) is available. Generating glowing premium icons...")
        sizes = [16, 32, 48, 128]
        for size in sizes:
            # Create a glowing neon violet and cyan background image
            image = Image.new("RGBA", (size, size), (11, 12, 16, 255))
            draw = ImageDraw.Draw(image)
            
            # Draw a glowing circle in the middle
            center = size // 2
            radius = int(size * 0.45)
            
            # Simple gradient circle
            for r in range(radius, 0, -1):
                # Gradient from violet to cyan
                ratio = r / radius
                r_val = int(79 * ratio + 0 * (1 - ratio))
                g_val = int(172 * ratio + 242 * (1 - ratio))
                b_val = int(254 * ratio + 254 * (1 - ratio))
                alpha = int(255 * (1 - ratio * 0.4))
                draw.ellipse(
                    [center - r, center - r, center + r, center + r],
                    fill=(r_val, g_val, b_val, alpha)
                )
            
            # Draw a lock shield symbol (padlock shape)
            lock_color = (11, 12, 16, 255)
            lock_w = int(size * 0.4)
            lock_h = int(size * 0.3)
            lock_x = center - lock_w // 2
            lock_y = center - lock_h // 3
            
            # Draw shackle
            shackle_r = int(size * 0.15)
            draw.arc(
                [center - shackle_r, lock_y - shackle_r, center + shackle_r, lock_y + shackle_r],
                180, 360, fill=lock_color, width=max(1, size // 16)
            )
            # Draw lock body
            draw.rounded_rectangle(
                [lock_x, lock_y, lock_x + lock_w, lock_y + lock_h],
                radius=max(1, size // 16), fill=lock_color
            )
            
            # Save the file
            image.save(os.path.join(icons_dir, f"icon{size}.png"))
            print(f"Saved premium icon{size}.png")
            
    except ImportError:
        print("PIL (Pillow) is not available. Falling back to simple PNG icons...")
        sizes = {
            16: (79, 172, 254),
            32: (0, 242, 254),
            48: (135, 92, 254),
            128: (79, 172, 254)
        }
        for size, color in sizes.items():
            png_bytes = make_png(size, size, color)
            with open(os.path.join(icons_dir, f"icon{size}.png"), 'wb') as f:
                f.write(png_bytes)
            print(f"Saved fallback solid icon{size}.png")

if __name__ == "__main__":
    main()
