grokdb
======

> Flashcard app to help you grok better. **WORK IN PROGRESS.**

*This app is currently in heavy development; and all commits will be squashed for the initial public consumption.*

![](https://raw.githubusercontent.com/grokdb/artwork/master/screenshot.png)

Usage
=====

Run from your terminal:

```sh
$ grokdb [options] <database name>
```

Access the client from your favourite browser (assuming port `8080`): [http://localhost:8080/](http://localhost:8080/)

## Options

```
 --port, -p "8080"    Port number to serve
 --mathjax            Alternative source folder of MathJax to serve
 --app                Alternative source folder of app to serve
 --help, -h           Show help
 --version, -v        Print the version
```

## MathJax

[markdown-it](https://github.com/markdown-it/markdown-it) is being used for Markdown parsing/rendering. 

LaTeX math can be used anywhere where Markdown can be parsed/rendered. For example: 

```
$$\zeta(s) = \sum_{n=1}^\infty \frac{1}{n^s}$$
```

MathJax is used to render these math markup. The actual MathJax source library is not bundled with grokdb since it is fairly large (>100 MB in size). Instead the source is fetched via the Internet through the following CDN link: `https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML`

The default MathJax configuration is enforced: `TeX-AMS-MML_HTMLorMML`. (This may be configurable in the future.)

### local copy of MathJax

As an alternative, you may choose to have grokdb use a local copy of MathJax:

1. Download the source: https://github.com/mathjax/MathJax/releases
2. Extract.
3. Run `grokdb --mathjax=path/to/folder <database name>` (modify with additional options as necessary)


This is very useful for when Internet access is spotty or not available.

## Alternative app

When running grokdb, it acts like a REST api (courtesy of [gin](https://github.com/gin-gonic/gin)). So you can modify the database through it using your favourite REST client (e.g. [HTTPie](https://github.com/jkbrzt/httpie)).

You can have grokdb serve an alternative application directory rather than the bundled app:

```
grokdb --app=path/to/app <database name>
```

Card Performance
================

The card's performance is measured using binary votes (successes and fails) that are akin to Reddit upvotes/downvotes.

The calculation of this score is based on the following references:

- http://planspace.org/2014/08/17/how-to-sort-by-average-rating/
- [How to Count Thumb-Ups and Thumb-Downs: User-Rating based Ranking of Items from an Axiomatic Perspective](http://www.dcs.bbk.ac.uk/~dell/publications/dellzhang_ictir2011.pdf) by D Zhang, R Mao, H Li, and J Mao.

All cards are ranked based on this score and as well as the date and time that they were last reviewed.

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

External dependencies will be used outside of npm (not yet used):
- jquery
- d3
- metricgraphics

License
=======

MIT
