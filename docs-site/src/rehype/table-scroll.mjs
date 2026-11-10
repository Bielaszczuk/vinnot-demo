// Rehype plugin: wraps every table in a container that scrolls horizontally, so a table wider than the
// content column scrolls inside it instead of spilling under the table of contents.

function wrapTables(node) {
  if (!node.children) return;
  node.children = node.children.map(child => {
    wrapTables(child);
    if (child.type !== 'element' || child.tagName !== 'table') return child;
    return { type: 'element', tagName: 'div', properties: { className: ['table-scroll'] }, children: [child] };
  });
}

export default function tableScroll() {
  return tree => {
    wrapTables(tree);
  };
}
