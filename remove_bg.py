import sys
from rembg import remove
from PIL import Image
import io

def process_image(input_path, output_path):
    print(f"Processing {input_path}")
    orig_img = Image.open(input_path)
    
    # Crop the bottom part to remove text (keep top 70%)
    w, h = orig_img.size
    cropped_img = orig_img.crop((0, 0, w, int(h * 0.75)))
    
    img_byte_arr = io.BytesIO()
    cropped_img.save(img_byte_arr, format='PNG')
    input_data = img_byte_arr.getvalue()
        
    print("Removing background...")
    output_data = remove(input_data)
    
    img = Image.open(io.BytesIO(output_data))
    
    # Crop to bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    in_path = r"C:\Users\Usuario\.gemini\antigravity\brain\5c462cb5-d3e8-4f78-a16b-63f40a78a9d3\fronteras_logo_1774556190271.png"
    out_path = r"d:\PRYECTOS APROBADOS\FRONTERAS\fronteras-ui\public\logo-mark.png"
    process_image(in_path, out_path)
