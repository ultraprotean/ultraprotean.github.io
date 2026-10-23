# ultraprotean.github.io

Jeff Walker's portfolio, live at https://ultraprotean.github.io/.

Plain HTML, CSS and a little JavaScript. There is no build step: GitHub Pages serves the files as they are.

## Run it locally

```bash
python -m http.server 8081
```

Then open http://localhost:8081.

## Notes

- The look (parchment windows, pixel headings, three themes, a drifting background) is borrowed from the VibeMail project. Each visit picks a random theme, pattern and drift, remembered for the life of the browser tab. The theme dots, Shuffle and Motion controls in the top bar change it.
- Motion is off whenever the visitor's device asks for reduced motion, and can be switched off from the top bar (saved in `localStorage`).
- `assets/app.js` holds the background drift: a small velocity-easing loop, so changes glide instead of jumping.
- Fonts are self-hosted in `fonts/`: Pixelify Sans and Nunito, both under the SIL Open Font License (licenses included).
- To add a project, copy the `<article class="project window">` block in `index.html` and replace the "Entry 02" placeholder.
