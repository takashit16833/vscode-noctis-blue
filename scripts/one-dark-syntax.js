'use strict';

// Atom One Dark syntax roles, expressed as VS Code TextMate/semantic token rules.
// Only the roles are defined here; every color comes from palette/colors.json.
// Source: atom/one-dark-syntax/styles/syntax/_base.less and its language overrides.
function buildOneDarkSyntax(p) {
  const rule = (name, scope, foreground, fontStyle) => ({
    name, scope,
    settings: {
      foreground,
      ...(fontStyle === undefined ? {} : { fontStyle })
    }
  });

  const tokenColors = [
    // One Dark: mono-3 comments (italic); mono-1 normal text/parameters.
    rule('Comments', ['comment', 'punctuation.definition.comment', 'string.comment'],
      p.comment, 'italic'),
    rule('Strings', ['string', 'string.quoted', 'string.template'], p.green),
    rule('Regular expressions', ['string.regexp', 'constant.regexp'], p.cyanDim),
    rule('Escape sequences', ['constant.character.escape'], p.cyanDim),
    rule('Embedded source', ['string source', 'string source.embedded'], p.pale),
    rule('String links', ['string.other.link'], p.cursor),

    // Red variables, neutral arguments/properties, orange constants.
    rule('Variables', ['variable', 'support.variable', 'meta.definition.variable.name'], p.cursor),
    rule('Parameters', ['variable.parameter', 'entity.name.variable.parameter'], p.pale),
    rule('Python parameters', ['source.python variable.parameter'], p.orange),
    rule('Properties', ['variable.other.property', 'variable.other.object.property',
      'meta.object-literal.key'], p.pale),
    rule('JSON properties', [
      'support.type.property-name.json',
      'support.type.property-name.json.comments',
      'support.type.property-name.json.lines'
    ], p.cursor),
    rule('Constants', ['constant', 'constant.numeric', 'constant.language',
      'constant.character', 'constant.other'], p.orange),
    rule('JSON constants', [
      'source.json constant.language',
      'source.json.comments constant.language',
      'source.json.lines constant.language'
    ], p.cyanDim),
    rule('Symbols', ['constant.other.symbol', 'constant.other.color'], p.cyanDim),

    // One Dark operators are ordinarily neutral; JavaScript is the cyan exception.
    rule('Keywords', ['keyword', 'storage.type', 'storage.modifier'], p.typeBright),
    rule('Import and package modifiers', ['storage.modifier.import',
      'storage.modifier.package'], p.pale),
    rule('Operators', ['keyword.operator'], p.pale),
    rule('JavaScript operators', ['source.js keyword.operator',
      'source.js.jsx keyword.operator'], p.cyanDim),
    rule('JavaScript word operators', [
      'source.js keyword.operator.delete', 'source.js keyword.operator.in',
      'source.js keyword.operator.of', 'source.js keyword.operator.instanceof',
      'source.js keyword.operator.new', 'source.js keyword.operator.typeof',
      'source.js keyword.operator.void'
    ], p.typeBright),
    rule('C-family operators', [
      'source.c keyword.operator', 'source.cpp keyword.operator',
      'source.cs keyword.operator', 'source.java keyword.operator.instanceof',
      'source.python keyword.operator.logical'
    ], p.typeBright),
    rule('Special methods', ['keyword.other.special-method'], p.function),
    rule('Units', ['keyword.other.unit'], p.orange),
    rule('Java types and imports', ['source.java storage.type',
      'source.java storage.modifier.import'], p.gold),
    rule('INI keys', ['source.ini keyword.other.definition'], p.cursor),

    // Blue declared functions; cyan built-ins; yellow classes/types.
    rule('Functions', ['entity.name.function', 'entity.name.section',
      'meta.require'], p.function),
    rule('Built-in functions', ['support.function', 'support.type'], p.cyanDim),
    rule('Built-in methods', ['support.function.any-method'], p.function),
    rule('Types and classes', ['entity.name.type', 'entity.name.class',
      'support.class'], p.gold),
    rule('Inherited classes', ['entity.other.inherited-class'], p.green),

    // Red tags, orange attributes, blue ID attributes, neutral tag punctuation.
    rule('HTML tags', ['entity.name.tag'], p.cursor),
    rule('HTML attributes', ['entity.other.attribute-name'], p.orange),
    rule('HTML ID attributes', ['entity.other.attribute-name.id'], p.function),

    // CSS: supported properties/values are neutral, unknown ones subdued.
    rule('CSS properties', ['source.css meta.property-name',
      'source.css meta.property-value'], p.dim),
    rule('CSS supported properties', ['support.type.property-name.css',
      'support.constant.property-value'], p.pale),
    rule('CSS selectors', ['meta.selector'], p.typeBright),

    // One Dark's Markdown and markup rules.
    rule('Markdown heading', ['markup.heading'], p.cursor),
    rule('Markdown heading punctuation', ['punctuation.definition.heading',
      'punctuation.definition.identity'], p.function),
    rule('Markdown bold', ['markup.bold'], p.orange, 'bold'),
    rule('Markdown italic', ['markup.italic'], p.typeBright, 'italic'),
    rule('Markdown links', ['markup.underline.link', 'markup.link'], p.cyanDim),
    rule('Markdown link destination', ['meta.link'], p.orange),
    rule('Markdown quote', ['markup.quote'], p.orange),
    rule('Markdown raw', ['markup.raw'], p.green),
    rule('Markdown inserted', ['markup.inserted'], p.green),
    rule('Markdown deleted', ['markup.deleted'], p.cursor),
    rule('Markdown changed', ['markup.changed'], p.typeBright),

    // Delimiters otherwise inherit the normal pale text color.
    rule('Embedded punctuation', ['punctuation.section.embedded'], p.cursor),
    rule('Bold punctuation', ['punctuation.definition.bold'], p.gold, 'bold'),
    rule('Italic punctuation', ['punctuation.definition.italic'], p.typeBright, 'italic'),
    rule('Invalid', ['invalid.illegal'], p.softWhite, 'underline')
  ];

  // Semantic tokens take precedence over many TextMate rules in VS Code.
  // Repeat One Dark's roles here so the language server does not turn
  // variables back to pale or built-in functions back to regular blue.
  const semanticTokenColors = {
    namespace: p.pale,
    class: p.gold, type: p.gold, enum: p.gold, interface: p.gold,
    struct: p.gold, typeParameter: p.gold,
    'type.defaultLibrary': p.cyanDim,
    variable: p.cursor,
    'variable.readonly': p.orange,
    parameter: p.pale,
    'parameter:python': p.orange,
    property: p.pale,
    enumMember: p.orange,
    function: p.function, method: p.function, macro: p.function,
    'function.defaultLibrary': p.cyanDim,
    keyword: p.typeBright, modifier: p.typeBright,
    comment: { foreground: p.comment, italic: true },
    string: p.green, number: p.orange, regexp: p.cyanDim,
    decorator: p.gold
  };

  return { tokenColors, semanticTokenColors };
}

module.exports = { buildOneDarkSyntax };
