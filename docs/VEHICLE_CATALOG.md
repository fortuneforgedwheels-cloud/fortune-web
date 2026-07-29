# Shop By Vehicle catalog

Homepage section `FF Shop By Vehicle` uses `theme/assets/ff-vehicle-catalog.json`.

## Source

Vehicle year / make / model / chassis (+ bolt pattern & center bore) is pulled from the **public Apex Wheels Sanity dataset** used by apexwheels.com (`c8ihu5xk`).

Refresh:

```bash
npm run theme:pull-vehicles
npm run theme:push:code
```

`theme:push:code` includes `assets/*`, so the catalog JSON deploys with code pushes.
