/**
 * Virtual filesystem barrel — re-exports the public API.
 */

export type { FSNode, FSFileNode, FSDirNode } from './types'
export { file, dir, isFile, isDir } from './types'
export { createFilesystem } from './default-tree'
export { resolvePath, resolvePathString } from './resolver'
export {
  isProtectedPath,
  splitPath,
  createDir,
  createFile,
  removeNode,
  writeFile,
} from './mutations'
