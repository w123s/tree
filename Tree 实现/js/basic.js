(function ($) {
    $.extend({
        replaceAll: function (str, s1, s2) {
            if (str) {
                return str.replace(new RegExp(s1, "gm"), s2)
            } else {
                return str
            }
        },
        Hashtable: function () {
            Hash = function () { };
            Hash.prototype = {
                constructor: Hash,
                add: function (oKey, oVal) {
                    if (!this.hasOwnProperty(oKey)) {
                        this[oKey] = oVal
                    }
                },
                count: function () {
                    var _count = 0;
                    for (var iCount in this) {
                        if (this.hasOwnProperty(iCount)) {
                            _count++
                        }
                    };
                    return _count
                },
                remove: function (oKey) {
                    if (this.hasOwnProperty(oKey)) {
                        delete this[oKey]
                    }
                },
                update: function (oKey, oVal) {
                    this[oKey] = oVal
                },
                has: function (oKey) {
                    var type = typeof oKey;
                    if (type === 'string' || type === 'number') {
                        return this.hasOwnProperty(oKey)
                    } else if (type === 'function' && this.some(oKey)) {
                        return true
                    };
                    return false
                },
                clear: function () {
                    for (var oKey in this) {
                        if (this.hasOwnProperty(oKey)) {
                            delete this[oKey]
                        }
                    }
                },
                isempty: function () {
                    for (var oKey in this) {
                        if (this.hasOwnProperty(oKey)) {
                            return false
                        }
                    };
                    return true
                },
                each: function (fn) {
                    for (var oKey in this) {
                        if (this.hasOwnProperty(oKey)) {
                            fn.call(this, this[oKey], oKey, this)
                        }
                    }
                },
                map: function (fn) {
                    var hash = new Hash;
                    for (var oKey in this) {
                        if (this.hasOwnProperty(oKey)) {
                            hash.add(oKey, fn.call(this, this[oKey], oKey, this))
                        }
                    };
                    return hash
                },
                join: function (split) {
                    split = split !== undefined ? split : ',';
                    var rst = [];
                    this.each(function (oVal) {
                        rst.push(oVal)
                    });
                    return rst.join(split)
                },
                every: function (fn) {
                    for (var oKey in this) {
                        if (this.hasOwnProperty(oKey)) {
                            if (!fn.call(this, this[oKey], oKey, this)) {
                                return false
                            }
                        }
                    };
                    return true
                },
                some: function (fn) {
                    for (var oKey in this) {
                        if (this.hasOwnProperty(oKey)) {
                            if (fn.call(this, this[oKey], oKey, this)) {
                                return true
                            }
                        }
                    };
                    return false
                },
                find: function (oKey) {
                    var type = typeof oKey;
                    if (type === 'string' || type === 'number' && this.has(oKey)) {
                        return this[oKey]
                    } else if (type === 'function') {
                        for (var _oKey in this) {
                            if (this.hasOwnProperty(_oKey) && oKey.call(this, this[_oKey], _oKey, this)) {
                                return this[_oKey]
                            }
                        }
                    };
                    return null
                }
            };
            return new Hash()
        },
        isNull: function (objVal) {
            if (typeof (objVal) == "undefined" || objVal == null) {
                return true
            };
            if (typeof (objVal) == "number" || typeof (objVal) == "boolean") {
                return false
            };
            if (objVal == "") {
                return true
            };
            try {
                if (objVal.length == 0) {
                    return true
                };
                var strComp = $.replaceAll(String(objVal), " ", "");
                if (strComp == "" || strComp == "&nbsp;" || strComp.length == 0) {
                    return true
                } else {
                    return false
                }
            } catch (error) {
                return false
            }
        },
        isNumber: function (obj) {
            return (!isNaN(obj) && typeof (obj) == "number")
        },
        newGuid: function () {
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
            };
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4()).toUpperCase()
        },
        loadXmlFile: function (xmlFilePath) {
            var retXmlDoc = null;
            if (xmlFilePath) {
                $.ajax({
                    type: 'GET',
                    async: false,
                    url: xmlFilePath,
                    dataType: 'xml',
                    success: function (xmlData) {
                        retXmlDoc = xmlData
                    }
                })
            };
            return retXmlDoc
        },
        loadXmlString: function (xmlStr) {
            var retXmlDoc = null;
            if (xmlStr) {
                try {
                    retXmlDoc = $.parseXML(xmlStr)
                } catch (g) {
                    retXmlDoc = null
                }
            };
            return retXmlDoc
        },
        stopBubble: function (event) {
            event = event || window.event;
            $.preventDefault(event);
            $.stopPropagation(event);
            return false
        },
        preventDefault: function (event) {
            event = event || window.event;
            if (event.preventDefault) {
                event.preventDefault()
            };
            event.returnValue = false
        },
        stopPropagation: function (event) {
            event = event || window.event;
            if (event.stopPropagation) {
                event.stopPropagation()
            };
            event.cancelBubble = true
        },
        runStrEvent: function (strEvent, e) {
            var retEventValue = null;
            if (!strEvent) {
                return retEventValue
            };
            var _runEvent = $.strToFunction(strEvent);
            if (typeof (_runEvent) == 'function') {
                try {
                    retEventValue = _runEvent.call(null, e)
                } catch (err) {
                    retEventValue = err
                }
            } else {
                alert("错误：事件方法有误！" + strEvent);
                retEventValue = "ERROR:事件方法有误！"
            };
            if (typeof (retEventValue) == 'undefined') {
                retEventValue = null
            };
            return retEventValue
        },
        strToFunction: function (strEvent) {
            if (typeof (strEvent) == "function") {
                return strEvent
            } else if (!strEvent || typeof (strEvent) != "string") {
                return null
            } else {
                try {
                    strEvent = $.trim(String(strEvent));
                    if (strEvent.indexOf('(') > 0) {
                        strEvent = strEvent.substring(0, strEvent.indexOf('('))
                    };
                    return (new Function("return " + strEvent))()
                } catch (error) {
                    return null
                }
            }
        },
        getJSON_FromFile: function (filePath) {
            var jsonObj = null;
            if (filePath) {
                $.ajaxSettings.async = false;
                $.getJSON(filePath,
                function (retData) {
                    jsonObj = retData
                });
                $.ajaxSettings.async = true
            };
            return jsonObj
        },
        getJSON_FromStr: function (jsonStr) {
            var jsonObj = null;
            if (jsonStr) {
                try {
                    jsonObj = $.parseJSON(jsonStr)
                } catch (error) {
                    jsonObj = null
                }
            };
            return jsonObj
        }

    });
})(jQuery);