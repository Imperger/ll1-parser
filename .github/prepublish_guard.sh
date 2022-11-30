#!/bin/bash

verlte() {
    [  "$1" = "`echo -e "$1\n$2" | sort -V | head -n1`" ]
}

verlt() {
    [ "$1" = "$2" ] && return 1 || verlte $1 $2
}

pkgName=$(npm pkg get name)
pkgName=${pkgName:1:-1}
pubVer=$(npm view -s $pkgName version || echo "0.0.0")

locVer=$(npm pkg get version)
locVer=${locVer:1:-1}

echo -e "Local: $locVer \nPublished: $pubVer"

verlt $pubVer $locVer && echo "release=true" >> $GITHUB_OUTPUT

true