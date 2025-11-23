# Map Image Setup

To use the interactive map feature, you need to add the Mitchell Park Domes map image to this directory.

## Instructions

1. Save the Mitchell Park Domes map image as `mitchell-park-domes-map.jpg` in this directory (`/client/public/`)
2. The image should be a high-resolution map of the Mitchell Park Domes facility
3. The map will be used as the base layer for the interactive location tag visualization

## Image Requirements

- Format: JPG, PNG, or WebP
- Recommended resolution: At least 2000x2000 pixels for good quality
- The image should show the full layout of the Mitchell Park Domes including:
  - The three main domes (Floral Show, Arid Desert, Tropical Jungle)
  - Greenhouses
  - Gardens and outdoor areas
  - Pathways and parking areas

## Coordinate System

The map uses a simple coordinate system where:
- The image bounds are set to `[[0, 0], [1000, 1000]]` by default
- Location points and polygons are stored as normalized coordinates (0-1) relative to the image dimensions
- You can adjust the `imageBounds` prop in the InteractiveMap component if your image has different dimensions

## Customization

If your image has different dimensions or aspect ratio, update the `imageBounds` prop in:
- `client/src/pages/AdminDashboard.tsx` (in the LocationTagsManager component)
- The bounds should be: `[[south, west], [north, east]]` where:
  - south/west = bottom-left corner (typically [0, 0])
  - north/east = top-right corner (e.g., [imageHeight, imageWidth])

