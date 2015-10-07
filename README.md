wunderfoo
============

> Flashcard app. **WORK IN PROGRESS.**

This app is currently in heavy development; and all commits will be squashed for the initial public consumption.

Usage
=====

Run from your terminal:

```sh
$ wunderfoo
```

Access the client from your favourite browser: [http://localhost:3030/](http://localhost:3030/)

Development
===========

```sh
cd client/
webpack -p
cd ..
./buildassets.sh
go build
```

Note that there are external dependencies used outside of npm:
- localforage
- jquery
- d3
- metricgraphics

License
=======

MIT
