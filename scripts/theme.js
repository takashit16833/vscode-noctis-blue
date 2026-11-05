'use strict';

// Noctis Blue theme generator. The palette is deliberately kept in one file.
function withAlpha(color, alpha) {
  return color + alpha;
}

function buildTheme(p,transparent){
  const colors={
    "foreground":p.dim,"descriptionForeground":p.foreground,"focusBorder":p.foreground,"errorForeground":p.cursor,
    "widget.border":p.border,"selection.background":withAlpha(p.selectionUi,"B2"),
    "editor.foreground":p.foreground,"textCodeBlock.background":p.markdownCodeBlockBackground,"editorCursor.foreground":p.cursor,"editorCursor.background":p.background,
    "editor.lineHighlightBackground":p.line,"editor.lineHighlightBorder":p.border,"editor.selectionBackground":p.selection,
    "editor.inactiveSelectionBackground":withAlpha(p.selection,"88"),"editor.selectionHighlightBackground":withAlpha(p.focus,"50"),
    "editor.wordHighlightBackground":p.match,"editor.wordHighlightStrongBackground":withAlpha(p.focus,"80"),
    "editor.findMatchBackground":withAlpha(p.gold,"55"),"editor.findMatchHighlightBackground":p.hover,
    "editor.findRangeHighlightBackground":p.match,"editor.hoverHighlightBackground":p.hover,
    "editorLineNumber.foreground":p.muted,"editorLineNumber.activeForeground":p.foreground,
    "editorGutter.modifiedBackground":p.gold,"editorGutter.addedBackground":p.green,"editorGutter.deletedBackground":p.cursor,
    "editorWhitespace.foreground":withAlpha(p.muted,"55"),"editorIndentGuide.background1":withAlpha(p.border,"70"),
    "editorIndentGuide.activeBackground1":p.dim,"editorBracketMatch.background":p.match,
    "editorBracketMatch.border":p.border,"editorError.foreground":p.cursor,"editorWarning.foreground":p.gold,
    "editorInfo.foreground":p.foreground,"editorHint.foreground":p.muted,"editorCodeLens.foreground":p.muted,
    "editorRuler.foreground":withAlpha(p.border,"66"),
    "sideBar.foreground":p.foreground,"sideBar.border":p.border,"sideBarTitle.foreground":p.dim,
    "sideBarSectionHeader.foreground":p.light,"sideBarSectionHeader.border":p.border,
    "activityBar.foreground":p.foreground,"activityBar.inactiveForeground":p.muted,"activityBar.border":p.border,
    "activityBar.activeBorder":p.foreground,"activityBarBadge.background":p.foreground,
    "activityBarBadge.foreground":p.background,
    "editorGroup.border":p.border,"editorGroupHeader.tabsBorder":p.border,
    "tab.activeForeground":p.foreground,"tab.inactiveForeground":p.muted,
    "tab.hoverBackground":p.focus,"tab.hoverForeground":p.white,
    "tab.border":p.border,"tab.activeBorderTop":p.foreground,"tab.activeModifiedBorder":p.gold,
    "titleBar.activeForeground":p.foreground,"titleBar.inactiveForeground":p.muted,"titleBar.border":p.border,
    "statusBar.foreground":p.dim,"statusBar.border":p.border,
    "statusBar.debuggingForeground":p.white,"statusBarItem.hoverBackground":p.match,
    "statusBarItem.remoteBackground":p.foreground,"statusBarItem.remoteForeground":p.background,
    "panel.border":p.border,"panelTitle.activeForeground":p.white,
    "panelTitle.inactiveForeground":p.muted,"panelTitle.activeBorder":p.foreground,
    "panelSectionHeader.foreground":p.foreground,"panelSectionHeader.border":p.border,
    "auxiliaryBar.foreground":p.foreground,"auxiliaryBar.border":p.border,
    "terminal.foreground":p.foreground,"terminalCursor.foreground":p.cursor,
    "terminalCursor.background":p.background,
    "terminal.ansiBlack":p.black,"terminal.ansiBrightBlack":p.inactiveForeground,
    "terminal.ansiBlue":p.dim,"terminal.ansiBrightBlue":p.foreground,
    "terminal.ansiCyan":p.cyanDim,"terminal.ansiBrightCyan":p.cyan,
    "terminal.ansiGreen":p.green,"terminal.ansiBrightGreen":p.green,
    "terminal.ansiMagenta":p.type,"terminal.ansiBrightMagenta":p.typeBright,
    "terminal.ansiRed":p.cursor,"terminal.ansiBrightRed":p.errorBright,
    "terminal.ansiWhite":p.white,"terminal.ansiBrightWhite":p.softWhite,
    "terminal.ansiYellow":p.gold,"terminal.ansiBrightYellow":p.gold,
    "list.activeSelectionBackground":p.focus,"list.activeSelectionForeground":p.white,
    "list.inactiveSelectionBackground":p.match,"list.inactiveSelectionForeground":p.light,
    "list.hoverBackground":p.hover,"list.hoverForeground":p.white,
    "list.highlightForeground":p.foreground,"list.errorForeground":p.cursor,"list.warningForeground":p.gold,
    "quickInput.background":p.panel,"quickInput.foreground":p.foreground,
    "quickInputList.focusBackground":p.focus,"quickInputList.focusForeground":p.white,
    "quickInputTitle.background":p.backgroundDeep,
    "input.background":p.backgroundDeep,"input.foreground":p.foreground,"input.border":p.border,
    "input.placeholderForeground":p.muted,"inputOption.activeBackground":p.focus,
    "inputOption.activeBorder":p.foreground,
    "editorWidget.background":p.panel,"editorWidget.foreground":p.foreground,
    "editorWidget.border":p.border,"editorHoverWidget.background":p.panel,
    "editorHoverWidget.foreground":p.foreground,"editorHoverWidget.border":p.border,
    "peekViewEditor.background":p.backgroundDeep,"peekViewResult.background":p.panel,
    "peekViewTitle.background":p.backgroundDeep,
    "menu.background":p.panel,"menu.foreground":p.foreground,
    "menu.selectionBackground":p.focus,"menu.selectionForeground":p.white,"menu.border":p.border,
    "commandCenter.background":p.panel,"commandCenter.foreground":p.foreground,
    "commandCenter.border":p.border,"commandCenter.activeBackground":p.focus,
    "scrollbarSlider.background":withAlpha(p.foreground,"40"),"scrollbarSlider.hoverBackground":withAlpha(p.foreground,"60"),
    "scrollbarSlider.activeBackground":withAlpha(p.foreground,"80"),
    "minimapSlider.background":withAlpha(p.foreground,"20"),"minimapSlider.hoverBackground":withAlpha(p.foreground,"40"),
    "minimapSlider.activeBackground":withAlpha(p.foreground,"60"),
    "breadcrumb.foreground":p.muted,"breadcrumb.focusForeground":p.foreground,
    "breadcrumb.activeSelectionForeground":p.white,"breadcrumbPicker.background":p.panel,
    "gitDecoration.modifiedResourceForeground":p.gold,"gitDecoration.deletedResourceForeground":p.cursor,
    "gitDecoration.untrackedResourceForeground":p.green,"gitDecoration.ignoredResourceForeground":p.muted,
    "gitDecoration.conflictingResourceForeground":p.orange,
    "notificationCenterHeader.background":p.backgroundDeep,
    "notificationCenterHeader.foreground":p.foreground,
    "notifications.background":p.panel,"notifications.foreground":p.foreground,
    "notifications.border":p.border,"button.background":p.foreground,"button.foreground":p.background,
    "button.hoverBackground":p.light,"button.secondaryBackground":p.focus,
    "button.secondaryForeground":p.white,"button.secondaryHoverBackground":p.border,
    "button.border":p.border,"settings.headerForeground":p.white,
    "settings.modifiedItemIndicator":p.gold,"settings.checkboxBackground":p.backgroundDeep,
    "settings.checkboxForeground":p.foreground,"settings.checkboxBorder":p.border
  };
  const surfaces={
    "editor.background":"background",
    "editorGutter.background":"background",
    "editorOverviewRuler.background":"background",
    "terminal.background":"background",
    "minimap.background":"background",
    "sideBar.background":"sidebar",
    "panel.background":"panel",
    "auxiliaryBar.background":"background",
    "activityBar.background":"panel",
    "titleBar.activeBackground":"background",
    "titleBar.inactiveBackground":"backgroundDeep",
    "statusBar.background":"backgroundDeep",
    "statusBar.debuggingBackground":"focus",
    "statusBar.noFolderBackground":"panel",
    "editorGroupHeader.tabsBackground":"backgroundDeep",
    "tab.activeBackground":"background",
    "tab.inactiveBackground":"backgroundDeep",
    "sideBarSectionHeader.background":"panel",
    "panelSectionHeader.background":"backgroundDeep",
    "auxiliaryBarSectionHeader.background":"panel"
  };
  for(const [key,role] of Object.entries(surfaces)) colors[key]=p[role]+(transparent?"00":"");
  // These are content highlights and controls, not full workbench surfaces.
  // In the transparent variant retain their original blue and reduce only
  // the background alpha. Borders, text, icons and opaque variant stay intact.
  if (transparent) {
    const translucentDetails = {
      "editor.lineHighlightBackground":[p.line,"80"],
      "editor.inactiveLineHighlightBackground":[p.line,"66"],
      "editor.selectionBackground":[p.selection,"A6"],
      "editor.inactiveSelectionBackground":[p.selection,"80"],
      "list.activeSelectionBackground":[p.focus,"B3"],
      "list.inactiveSelectionBackground":[p.match,"99"],
      "list.focusBackground":[p.focus,"B3"],
      "list.inactiveFocusBackground":[p.match,"99"],
      "input.background":[p.backgroundDeep,"80"],
      "dropdown.background":[p.backgroundDeep,"BF"],
      // Chat tip uses agentsChatInput.background (falls back to input.background).
      "agentsChatInput.background":[p.panel,"80"],
      // Dedicated highlight and suggestion colors in the actual workbench.
      "list.hoverBackground":[p.hover,"A6"],
      "modernTab.hoverBackground":[p.hover,"A6"],
      "tab.hoverBackground":[p.focus,"A6"],
      "editorSuggestWidget.background":[p.panel,"A6"],
      "editorSuggestWidget.selectedBackground":[p.focus,"B3"],
      // stickyScroll.css paints the hovered row separately from the blurred region.
      "editorStickyScrollHover.background":[p.focus,"A6"],
      // The rich Markdown editor maps fenced blocks to textCodeBlock.background.
      "textCodeBlock.background":[p.markdownCodeBlockBackground,"BF"]
    };
    for (const [key,[base,alpha]] of Object.entries(translucentDetails)) colors[key]=base+alpha;
  }

  const rule=(name,scope,foreground,fontStyle)=>({name,scope,settings:{...(foreground?{foreground}:{}),...(fontStyle!==undefined?{fontStyle}:{})}});
  // Keep frequent function names in the base blue and types in the subdued purple.
  const tokenColors=[
    rule("Comments",["comment","punctuation.definition.comment","string.comment"],p.comment,""),
    rule("Strings",["string","string.quoted","string.template","string.regexp"],p.white),
    rule("Operators",["keyword.operator","punctuation.separator"],p.operator),
    rule("Punctuation",["punctuation","meta.brace","meta.brackets","meta.parentheses"],p.punctuation),
    rule("Keywords",["keyword","storage.type","storage.modifier"],p.pale,"bold"),
    rule("Numbers",["constant.numeric","constant.language","constant.other","constant.character"],p.gold),
    rule("Functions",["entity.name.function","support.function","meta.function-call","meta.method-call"],p.foreground,"bold"),
    rule("Types",["entity.name.type","entity.name.class","support.type","support.class","meta.return-type"],p.type,"bold"),
    rule("Variables",["variable","support.variable","meta.definition.variable.name"],p.pale),
    rule("JSON properties",[
      "support.type.property-name.json",
      "support.type.property-name.json.comments",
      "support.type.property-name.json.lines"
    ],p.foreground),
    rule("HTML tags",["entity.name.tag","entity.other.attribute-name","meta.tag"],p.foreground),
    rule("CSS properties",["support.type.property-name.css","support.constant.property-value"],p.light),
    rule("Markdown heading",["markup.heading"],p.pale,"bold"),
    rule("Markdown inline code",["markup.inline.raw","markup.fenced_code.block"],p.light),
    rule("Markdown emphasis",["markup.italic"],undefined,"italic"),
    rule("Markdown strong",["markup.bold"],undefined,"bold"),
    rule("Invalid",["invalid","invalid.illegal"],p.cursor,"underline")
  ];
  const semanticTokenColors={
    namespace:p.type,type:p.type,class:p.type,enum:p.type,
    interface:p.type,struct:p.type,typeParameter:p.type,
    parameter:p.pale,variable:p.light,property:p.pale,
    enumMember:p.gold,function:p.foreground,method:p.foreground,macro:p.foreground,
    keyword:p.pale,modifier:p.foreground,comment:p.comment,string:p.white,
    number:p.gold,regexp:p.white,operator:p.operator,decorator:p.gold
  };
  return {name:transparent?"Noctis Blue Transparent":"Noctis Blue",type:"dark",semanticHighlighting:true,colors,tokenColors,semanticTokenColors};
}

module.exports = { withAlpha, buildTheme };
