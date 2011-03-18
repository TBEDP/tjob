var STRING_FORMAT_REGEX = /\{\{([\w\s\.\(\)"',-\[\]]+)?\}\}/g;
String.prototype.format = function(values) {
    return this.replace(STRING_FORMAT_REGEX, function(match, key) {
        return values[key] || eval('(values.' +key+')');
    });
};
