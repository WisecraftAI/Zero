'use strict';

/**
 * JSDoc 4 uses Closure-style type expressions, while this repository uses
 * TypeScript-aware JSDoc for editor checking. Normalize the small set of
 * TypeScript-only expressions in memory so API generation does not require
 * weakening the source annotations.
 */
exports.handlers = {
  beforeParse(event) {
    event.source = event.source
      .replace(
        /ReturnType<import\((['"]).+?\1\)\.[A-Za-z_$][\w$]*>/g,
        'Object',
      )
      .replace(/Array<\{\s*id\?: string,\s*purpose: string\s*\}>/g, 'Array.<Object>')
      .replace(
        /Array<\{\s*category: string,\s*selector\?: string\s*\}>/g,
        'Array.<Object>',
      )
      .replace(/\{\s*type\?: string\s*\}/g, 'Object')
      .replace(
        /Record<string,\s*Array<string\|\{\s*selectorValue\?: string\s*\}>>/g,
        'Object.<string, Array.<(string|Object)>>',
      );
  },
};
