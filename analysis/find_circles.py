from PIL import Image

def find_circles(image_path):
    img = Image.open(image_path).convert('RGB')
    width, height = img.size
    pixels = img.load()
    
    # Threshold for white
    def is_white(p):
        return p[0] > 240 and p[1] > 240 and p[2] > 240
    
    # Quadrants
    quadrants = [
        ("DEFI", (0, 0, width//2, height//2)),
        ("AI", (width//2, 0, width, height//2)),
        ("SOCIAL", (0, height//2, width//2, height)),
        ("GAMES", (width//2, height//2, width, height))
    ]
    
    for name, (x1, y1, x2, y2) in quadrants:
        print(f"--- {name} ---")
        circles = []
        visited = set()
        for x in range(x1, x2, 10): # Step to speed up
            for y in range(y1, y2, 10):
                if is_white(pixels[x, y]) and (x, y) not in visited:
                    # Found a white pixel, find bounding box
                    left, top = x, y
                    right, bottom = x, y
                    
                    # Simple flood fill/grow to find bounds
                    stack = [(x, y)]
                    visited.add((x, y))
                    cluster = []
                    while stack:
                        cx, cy = stack.pop()
                        cluster.append((cx, cy))
                        for dx, dy in [(-10, 0), (10, 0), (0, -10), (0, 10)]:
                            nx, ny = cx + dx, cy + dy
                            if x1 <= nx < x2 and y1 <= ny < y2 and is_white(pixels[nx, ny]) and (nx, ny) not in visited:
                                visited.add((nx, ny))
                                stack.append((nx, ny))
                                left = min(left, nx)
                                right = max(right, nx)
                                top = min(top, ny)
                                bottom = max(bottom, ny)
                    
                    if len(cluster) > 5: # Valid circle
                        center_x = (left + right) / 2
                        center_y = (top + bottom) / 2
                        size = max(right - left, bottom - top) + 10 # Add back the step
                        circles.append((center_y, center_x, size))
        
        # Sort circles by y
        circles.sort()
        for i, (cy, cx, s) in enumerate(circles):
            print(f"Circle {i+1}: Center (y={cy:.0f}, x={cx:.0f}), Size ~{s:.0f}")

if __name__ == "__main__":
    find_circles("analysis/ecosystem.png")
