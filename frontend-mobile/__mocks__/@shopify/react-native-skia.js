/* global jest */
// Skia draws on a native surface that Jest cannot load. Tests render each Skia
// primitive as a plain host element, so components can be checked by their props.
import React from "react";

function primitive(name) {
  const Component = ({ children, ...props }) => React.createElement(`Skia${name}`, props, children);
  Component.displayName = `Skia${name}`;
  return Component;
}

function makePath() {
  const path = {};
  for (const method of ["moveTo", "lineTo", "quadTo", "cubicTo", "close", "addCircle", "addOval", "addRect", "reset", "detach", "build"]) {
    path[method] = jest.fn(() => path);
  }
  path.toSVGString = () => "";
  return path;
}

const image = { width: () => 256, height: () => 256 };

export const Canvas = primitive("Canvas");
export const Group = primitive("Group");
export const Image = primitive("Image");
export const Rect = primitive("Rect");
export const RoundedRect = primitive("RoundedRect");
export const Circle = primitive("Circle");
export const Oval = primitive("Oval");
export const Path = primitive("Path");
export const Points = primitive("Points");
export const Mask = ({ mask, children }) => React.createElement("SkiaMask", null, mask, children);
export const Blend = primitive("Blend");
export const BlurMask = primitive("BlurMask");
export const Shadow = primitive("Shadow");
export const DashPathEffect = primitive("DashPathEffect");
export const Paint = primitive("Paint");
export const Fill = primitive("Fill");
export const LinearGradient = primitive("LinearGradient");
export const RadialGradient = primitive("RadialGradient");
export const SweepGradient = primitive("SweepGradient");
export const useImage = () => image;
export const vec = (x = 0, y = 0) => ({ x, y });
export const rect = (x, y, width, height) => ({ x, y, width, height });
export const Skia = {
  Path: { Make: makePath },
  PathBuilder: { Make: makePath },
  XYWHRect: (x, y, width, height) => ({ x, y, width, height }),
};
