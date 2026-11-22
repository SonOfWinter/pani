import { execFileSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'
import { ESLint } from 'eslint'

function pathsFromGit(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean)
}

const staged = pathsFromGit('diff', '--cached', '--name-only', '--diff-filter=ACMRT', '-z')
  .filter((path) => /\.[cm]?[jt]sx?$/u.test(path))
const modified = new Set(pathsFromGit('diff', '--name-only', '-z'))
const partial = staged.filter((path) => modified.has(path))

if (partial.length) {
  console.error('ESLint : des fichiers de code indexés ont aussi des changements hors index.')
  for (const path of partial) console.error(JSON.stringify(path))
  console.error('Indexez leur version complète ou mettez temporairement de côté les changements hors index, puis relancez le commit.')
  process.exitCode = 1
} else if (staged.length) {
  const eslint = new ESLint({ errorOnUnmatchedPattern: false, globInputPaths: false, warnIgnored: false })
  const results = await eslint.lintFiles(staged)
  const formatter = await eslint.loadFormatter('stylish')
  const report = await formatter.format(results)
  if (report) console.error(report)
  if (results.some(({ errorCount, warningCount }) => errorCount || warningCount)) process.exitCode = 1
}
