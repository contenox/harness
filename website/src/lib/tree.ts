import { getCollection } from 'astro:content';
import { entryTitle, published } from './entries';

export interface TreeNode {
  name: string;
  url?: string;
  title?: string;
  children: TreeNode[];
}

function insert(root: TreeNode, parts: string[], url: string, title: string) {
  const lastName = parts[parts.length - 1];
  const isIndex = lastName === 'index' || lastName.toLowerCase() === 'readme';

  let node = root;
  for (const part of parts.slice(0, -1)) {
    let child = node.children.find((c) => c.name === part);
    if (!child) {
      child = { name: part, children: [] };
      node.children.push(child);
    }
    node = child;
  }

  if (isIndex) {
    node.url = url;
    if (!node.title) node.title = title;
  } else {
    node.children.push({ name: lastName, url, title, children: [] });
  }
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    const rank = (n: TreeNode) => (n.name.toLowerCase() === 'readme' || n.name === 'index' ? 0 : 1);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

export async function buildDocsTree(): Promise<TreeNode> {
  const root: TreeNode = { name: '', children: [] };
  for (const entry of await getCollection('docs', published)) {
    insert(root, entry.id.split('/'), `/docs/${entry.id}/`, entryTitle(entry));
  }
  sortTree(root);
  return root;
}

export async function buildNavSections(): Promise<{ name: string; url: string }[]> {
  const tree = await buildDocsTree();
  return tree.children
    .filter((n) => n.url || n.children.length > 0)
    .map((n) => ({
      name: n.name,
      url: n.url ?? `/docs/#${n.name}`,
    }));
}
