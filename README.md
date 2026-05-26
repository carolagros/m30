# M30

Web interactiva del regal M30: portada sense scroll, entrada animada amb fotos, carrusel d'aniversaris, calendari anual, mini calendari del dia, vídeo i footer.

## Desenvolupament

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

El build es genera a `docs/` amb rutes relatives, preparat per publicar-lo com a pàgina estàtica.

## Fotos

L'app llegeix `src/photo-manifest.json` i fa servir les imatges optimitzades de Firebase Storage. Si una imatge remota falla, es mostra una imatge local de reserva.
