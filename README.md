# Platinum Scissors

A premium, minimal, responsive storefront for browsing and shopping scissors. Built with semantic HTML5, modern responsive CSS, and vanilla JavaScript — no frameworks, no external build steps.

> **Demo storefront** — sample products and prices. No orders or payments are processed.

## Preview Locally

1. Open the project folder in VS Code or your preferred editor.
2. If using VS Code, right-click `index.html` and select **"Open with Live Server"**.
3. Alternatively, double-click `index.html` to open directly in any modern web browser.

## Key Features

1. **Add to Cart & Product Cards**:
   - Fixed button sizing and layout: price displayed in its own row with stock status, followed by equal-width "View Details" and "Add to Cart" action buttons.
   - Buttons automatically stack vertically on narrow cards and small mobile screens.
   - All product cards maintain identical height across the grid using Flexbox.

2. **Interactive Product Image Zoom**:
   - Click the product image or "Enlarge & Zoom Photo" button in the Product Details modal to launch a full-screen zoom lightbox.
   - Zoom in/out smoothly up to **3×** using `+` and `−` controls, mouse wheel, or keyboard shortcuts (`+` and `-`).
   - Drag or pan freely when zoomed in to inspect blade edges, screws, and craftsmanship without image clipping.
   - Touch-friendly: supports single-finger panning, double-tap toggle, and two-finger pinch-to-zoom.
   - Includes **Reset** (`0` or `R`) and **Close** (`Esc`) controls with accessible focus trapping.

3. **Realistic Product Photography**:
   - Replaced SVG drawings with studio-lit e-commerce photographs on clean neutral backgrounds:
     1. **Everyday Scissors** ($10.00): Ergonomic black-handled household scissors with stainless steel blades.
     2. **Tailoring Scissors** ($20.00): Heavy-duty fabric-cutting shears with polished brass/gold handles.
     3. **Precision Craft Scissors** ($35.00): Compact embroidery craft scissors with ultra-fine needle-point tips.
     4. **Hairdressing Scissors** ($50.00): Professional salon shears with Japanese steel convex blades and finger rest.

4. **Fully Responsive Across All Viewports**:
   - **Desktop (1025px+)**: 4-column product grid, full horizontal navigation, balanced hero split layout.
   - **Tablet (769px–1024px)**: 2-column product grid, adjusted spacing, touch-friendly filter toolbar.
   - **Mobile (up to 768px)**: Working hamburger slide-out menu, 1- or 2-column grid depending on width, full-width cart drawer, touch targets ≥ 44px, and zero unwanted horizontal scrolling down to 320px.

5. **Complete Customer Journey**:
   - Search scissors by title, description, or category.
   - Filter by category with "All" and direct category card jumping.
   - Sort by price (low-to-high, high-to-low).
   - Quantity selector in product modal (1–99) and cart drawer.
   - Real-time automatic line total and order total calculation.
   - Safe `localStorage` persistence surviving page refresh.
   - Review Order modal with plain-text summary download (`.txt`).
   - Accessible FAQ accordion and validated demo contact form.

## Project Structure

```
platinum-scissors/
  index.html                  ← Storefront page and modal dialogs
  README.md                   ← Project documentation
  assets/
    css/
      style.css               ← Responsive styles, CSS grid, variables, zoom viewer
    js/
      products.js             ← Product catalogue array (prices in integer cents)
      app.js                  ← Cart, zoom viewer, modals, filters, mobile menu
    images/
      everyday-scissors.jpg   ← Realistic everyday scissors photo
      tailoring-scissors.jpg  ← Realistic tailoring shears photo
      craft-scissors.jpg      ← Realistic craft scissors photo
      hairdressing-scissors.jpg ← Realistic hairdressing shears photo
      hero-scissors.svg       ← Editorial hero illustration
      favicon.svg             ← Browser tab icon
```

## How to Edit

### Products and Prices
Open `assets/js/products.js`. Each product is an object in `PRODUCTS`:
```js
{
  id: "everyday-01",
  name: "Everyday Scissors",
  category: "Everyday",
  priceCents: 1000,          // $10.00 stored in integer cents
  description: "...",
  image: "assets/images/everyday-scissors.jpg",
  alt: "...",
}
```
Prices are calculated in integer cents to eliminate floating-point rounding errors.

### Colours and Theme
Open `assets/css/style.css` and customize the CSS custom properties:
```css
:root {
  --white:       #FFFFFF;
  --grey-100:    #F3F4F6;
  --grey-700:    #374151;   /* Body text & icons */
  --grey-900:    #111827;   /* Headings & primary buttons */
}
```

## Deployment

### GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Branch**, choose `main` and root `/`.
4. Click **Save**.

### Netlify
1. Connect your repository to Netlify or drag the project folder into Netlify Drop.
2. Leave **Build command** empty.
3. Set **Publish directory** to `.` (root).
4. Click **Deploy**.
