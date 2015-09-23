#!/usr/bin/env bash

rm assets.go
go-bindata -o assets.go ./assets/
