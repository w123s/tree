(function ($) {
    $.fn.webTree = function () {
        return {
            sdptype: "tree",           // 树形目录
            myObject: null,            // Tree 树Jquery对象 $("#treeID")
            myContainer: null,         // Tree 包围树节点的容器Jquery对象[为了保证滚动条和位置的协调，特加入一个容器]
            myFnId: "",                // Tree 内部使用ID[目录树控件可以不定义ID，此属性就是为无ID的情况下也能适用]
            sdpTree: null,             // Tree 插件自动生成树节点的包围容器,与myContainer 容器非同一个容器，是在myContainer的内部
            focusNodeCode: null,       // Tree 树当前获取到焦点的节点编码
            defaults: {                // Tree 树默认相关参数
                sdpfixed: false,       // Tree 是否设计器设计的固定目录树
                showroot: true,        // Tree 是否显示根目录
                showline: true,        // Tree 是否显示连接竖线
                showicon: true,        // Tree 是否显示节点图片
                selecttype: "",        // Tree 树节点选择类型 "":表示无选择按钮; checkbox:表示启用复选按钮; radio:表示启用单选按钮
                cascade: false,        // Tree 开启复选按钮时，是否启用级联选择(自动勾选下级及所属上级)
                popmenu: false,        // Tree 是否启用右击弹出菜单
                openall: false,        // Tree 是否展开所有节点;false: 展开第一级
                rooticon: "",          // Tree 根目录节点自定义显示图标文件完整路径名称 [平台设计的则放在对应的图片目录中]
                middefticon: "",       // Tree 中间节点收缩自定显示图标文件完整路径名称
                midexpdicon: "",       // Tree 中间节点展开自定显示图标文件完整路径名称
                endnodeicon: "",       // Tree 末级节点显示自定显示图标文件完整路径名称
                customload: "",        // Tree 树自定加载事件（事件名称字符串或事件方法）[主要目的：为了让右击刷新按钮能找到重新加载数据的源头方法]
                nodeclick: "",         // Tree 树目录节点单击事件（事件名称字符串或事件方法）
                nodedblclick: "",      // Tree 树目录节点双击事件（事件名称字符串或事件方法）
                checkedchange: "",     // Tree 树目录节点选择改变事件（事件名称字符串或事件方法）[只有开启了选择，才有效]
                rootcode: "-1",        // Tree 根节点Code ID（目的是为支持从中间节点进行加载目录树的功能）默认为-1
                roottext: "树形目录",  // Tree 根目录节点名称
                rooturl: ""            // Tree 根目录超连接URL地址
            },
            options: {},               // Tree 控件最终参数
            curNodes: [],              // Tree 临时树节点数组(添加节点时临时储存)

            // @ method: init() 插件实例初始化
            // @ depict: 执行插件实例的初始化
            // @ params: [object] element 控件对象
            // @ pbtype: 外部调用方法
            init: function (element) {        // 树初始化
                this.myObject = $(element);
                if (this.myObject.length == 0) { return; };
                this.myContainer = this.myObject.children('div[sdptype="treebase"]');
                if (this.myContainer.length == 0) { // 重新创建
                    this.myObject.empty().append('<div sdptype="treebase" class="sdp-tree-base" ></div>');
                    this.myContainer = this.myObject.children('div[sdptype="treebase"]');
                };
                this.myFnId = this.myObject.attr("id") || $.newGuid();               // Tree 内部使用ID 用于创建NODE各个节点
                this.myContainer.empty().append('<div class="sdp-tree-in"></div>');  // 添加一个正式的目录树容器
                this.sdpTree = this.myContainer.find("div.sdp-tree-in");             // 获取sdpTree容器Jquery对象

                // 设置内部参数
                this._methods._fnObject = this;
                this._methods._myObject = this.myObject;
                this._methods._myContainer = this.myContainer;
                this._methods._myFnId = this.myFnId;
                this._methods._sdpTree = this.sdpTree;

                // 加载绑定参数
                this._loadParam();
                this._bindEvent();
            },

            // @ method: setOptions() 自定设置控件Options属性值
            // @ depict: 自定设置控件Options属性值
            // @ params: [object] options 树形配置参数 Json格式
            // @ pbtype: 外部调用方法
            setOptions: function (options) {
                if (!options) { options = {}; };
                this.options = $.extend({}, this.options, options);  // 合并目录树相关参数
            },

            // @ method: nodeItem() 创建一个空节点参数对象
            // @ depict: 通过此方法创建一个空节点参数对象，用于前台初始化增加节点或执行插入节点使用,通过扩展方法来组合参数
            // @ return: [array]节点{  // 节点参数
            // @                       nodecode: "",         // string  节点编码 
            // @                       nodetext: "",         // string  节点名称文本 
            // @                       nodetitle: "",        // string  节点鼠标移入显示提示文本
            // @                       supnodecode: "",      // string  节点所属上级即父节点编码
            // @                       nodeurl: "",          // string  节点关联链接地址
            // @                       iconexpand: "",       // string  节点展开时显示图标完整路径
            // @                       iconcollapse: ""      // string  节点收缩时显示图标完整路径
            // @                     }
            // @ pbtype: 外部调用方法
            nodeItem: function () {
                return {
                    nodecode: "",
                    nodetext: "",
                    nodetitle: "",
                    supnodecode: "",
                    nodeurl: "",
                    iconexpand: "",     // 节点展开时显示图标完整路径
                    iconcollapse: ""    // 节点收缩时显示图标完整路径
                };
            },


            // 创建树形目录
            // 由开发人员通过以下3种方式创建树数据
            // 1、loadJson(Json)             JSON 对象目录树节点数组(一次性完成)
            // 2、loadXml(xml)               XML字符串格式的节点数据(一次性完成)
            // 3、addNodeItem(nodeItem)      通过手工一条一条的添加节点项目(需要两步完成)
            // 3、makeTree()                 再手工调用此方法，则可以创建树

            // @ method: addNodeItem() 添加目录树节点
            // @ depict: 通过此方法向目录树添加节点数据
            // @ params: [array] nodeItem{} 格式参数数组
            // @ pbtype: 外部调用方法
            addNodeItem: function (nodeItem) {
                var _curNodeItem = $.extend({}, new this.nodeItem(), nodeItem);   // 合并参数
                if ($.isNull(_curNodeItem.nodecode)) { return; };
                if ($.isNull(_curNodeItem.supnodecode)) { _curNodeItem.supnodecode = this.options.rootcode; };
                this.curNodes[this.curNodes.length] = {                           // 在临时树节点数组中添加待加入的节点信息
                    nodecode: _curNodeItem.nodecode,
                    nodetext: _curNodeItem.nodetext || "",
                    nodetitle: _curNodeItem.nodetitle || "",
                    supnodecode: _curNodeItem.supnodecode,
                    nodeurl: _curNodeItem.nodeurl || "",
                    iconexpand: _curNodeItem.iconexpand || "",
                    iconcollapse: _curNodeItem.iconcollapse || "",
                    _parent: null,            // 所属的父节点 
                    _firstFlag: false,        // 本级中的首位 标志
                    _lastFlag: false,         // 本级中的末位 标志
                    _nodeLevel: 0,            // 当前节点级别 默认0
                    _haveChild: false,        // 是否包含下级
                    _childs: []               // 子节点的数组
                };
                _curNodeItem = null;
            },

            // @ method: loadXml() 加载XML格式的节点数据
            // @ depict: 直接加载解析XML格式的节点数据
            // @ params: [object] xml XML格式的节点字符串或XmlDocument对象
            // @ pbtype: 外部调用方法
            loadXml: function (xml) {
                if ($.isNull(this.options.rootcode)) { this.options.rootcode = "-1"; }; // 设置根节点编码
                this.curNodes = [];                                                     // 清空变量数据
                if (xml) {
                    var currXmlDoc = null;
                    if (typeof (xml) == "object") {
                        currXmlDoc = xml;
                    } else {                          //   string
                        currXmlDoc = $.loadXmlString(String(xml));
                    };
                    if (currXmlDoc) {               // 再次判定  开始解析
                        for (var nn = 0; nn < currXmlDoc.documentElement.childNodes.length; nn++) {
                            var _curNode = currXmlDoc.documentElement.childNodes[nn];
                            var _curAddItem = new this.nodeItem();
                            for (var jj = 0; jj < _curNode.childNodes.length; jj++) {
                                var _subItem = _curNode.childNodes[jj];
                                switch (_subItem.tagName.toLowerCase()) {
                                    case "nodecode":
                                        _curAddItem.nodecode = $(_subItem).text();
                                        break;
                                    case "nodetext":
                                        _curAddItem.nodetext = $(_subItem).text();
                                        break;
                                    case "nodetitle":
                                        _curAddItem.nodetitle = $(_subItem).text();
                                        break;
                                    case "supnodecode":
                                        _curAddItem.supnodecode = $(_subItem).text();
                                        break;
                                    case "nodeurl":
                                        _curAddItem.nodeurl = $(_subItem).text();
                                        break;
                                    case "iconexpand":
                                        _curAddItem.iconexpand = $(_subItem).text();
                                        break;
                                    case "iconcollapse":
                                        _curAddItem.iconcollapse = $(_subItem).text();
                                        break;
                                };
                            };

                            this.addNodeItem(_curAddItem);
                        }
                    }
                };

                this.makeTree();

                // 说明：采用XML字符串格式
                // <root>
                //    <item>   // 每一个节点 内包含多个数据值   
                //        <nodecode><![CDATA[节点编码值]]></nodecode>";          注意节点 tagName：nodecode nodetext 等 不允许变更 因为程序内部是直接采用这个名字来获取的         
                //        <nodetext><![CDATA[节点名称文本 ]]></nodetext>";  
                //        <nodetitle><![CDATA[节点鼠标移入显示提示文本]]></nodetitle>";  
                //        <supnodecode><![CDATA[节点所属上级即父节点编码]]></supnodecode>";  
                //        <nodeurl><![CDATA[节点关联链接地址]]></nodeurl>"; 
                //        <iconexpand><![CDATA[节点展开时显示图标路径]]></iconexpand>";  
                //        <iconcollapse><![CDATA[节点收缩时显示图标路径]]></iconcollapse>";  
                //    </item>
                //</root>
            },

            // @ method: loadJson() 加载JSON格式的节点数据
            // @ depict: 直接加载解析JSON格式的节点数据
            // @ params: [array] json JSON数据对象
            // @ pbtype: 外部调用方法
            loadJson: function (json) {
                if (!this.options.rootcode) { this.options.rootcode = "-1"; };            // 设置根节点编码
                this.curNodes = [];                                                       // 清空变量数据
                if (json) {
                    for (var jj = 0; jj < json.length; jj++) {
                        var jsonItem = json[jj];
                        if (!jsonItem.nodecode) { continue; };   // 节点编码不允许为空

                        var addsItem = new this.nodeItem();
                        addsItem.nodecode = jsonItem.nodecode;
                        addsItem.nodetext = jsonItem.nodetext || "";
                        addsItem.nodetitle = jsonItem.nodetitle || "";
                        addsItem.supnodecode = jsonItem.supnodecode || "";
                        addsItem.nodeurl = jsonItem.nodeurl || "";
                        addsItem.iconexpand = jsonItem.iconexpand || "";
                        addsItem.iconcollapse = jsonItem.iconcollapse || "";

                        this.addNodeItem(addsItem);   // 添加节点 
                    };
                };
                this.makeTree();

                // JSON 格式 是一个Array 数组 每项为一个 nodeItem 对象的参数
                // [{ nodecode: "", nodetext: "", nodetitle: "",supnodecode: "",nodeurl: "",iconexpand: "",iconcollapse: ""},
                //   {},...
                // ]
            },

            // @ method: loadNodeItems() 加载NodeItem Array节点数组数据
            // @ depict: 直接加载NodeItem Array节点数组数据
            // @ params: [array] itemArray NodeItem Array节点数组数据
            // @ pbtype: 外部调用方法
            loadNodeItems: function (itemArray) {
                if (!itemArray) { itemArray = []; };
                for (var jj = 0; jj < itemArray.length; jj++) {
                    var ndItem = itemArray[jj];
                    if (!ndItem.nodecode) { continue; };   // 节点编码不允许为空
                    this.addNodeItem(ndItem);              // 添加节点 
                };
                this.makeTree();
            },

            // @ method: makeTree() 创建生成树
            // @ depict: 创建生成树对象的所有节点并显示出来
            // @         此方法执行之前需要先获取或手工添加完成所有树节点
            // @         前台JS 必须通过 addNodeItem(nodeItem) 方法添加节点
            // @ pbtype: 外部内部调用方法
            makeTree: function () {
                this.sdpTree.empty();
                this._methods._createTree();
            },

            // @ method: appendNode() 插入节点
            // @ depict: 通过此方法向目录树插入新的节点
            // @ params: [array] nodeItem {} 格式参数数组
            // @ pbtype: 外部调用方法
            appendNode: function (nodeItem) {
                var _this = this, P = this.options;
                var curNewNode = $.extend({}, new this.nodeItem(), nodeItem);          // 合并节点输入参数
                if ($.isNull(curNewNode.nodecode)) { return; };
                if ($.isNull(curNewNode.supnodecode)) { curNewNode.supnodecode = P.rootcode; };
                if (this._methods._hsNodes[curNewNode.nodecode]) { return; };          // 节点编码已经存在,不执行添加
                if (P.rootcode != curNewNode.supnodecode && !this._methods._hsNodes[curNewNode.supnodecode]) { return; };  // 父节点不为根节点时，父节点数据不存在，则不执行
                var newNode = {
                    nodecode: curNewNode.nodecode,
                    nodetext: curNewNode.nodetext || "",
                    nodetitle: curNewNode.nodetitle || "",
                    supnodecode: curNewNode.supnodecode,
                    nodeurl: curNewNode.nodeurl || "",
                    iconexpand: curNewNode.iconexpand || "",
                    iconcollapse: curNewNode.iconcollapse || "",
                    _parent: null,            // 所属的父节点 
                    _firstFlag: false,        // 本级中的首位 标志
                    _lastFlag: false,         // 本级中的末位 标志
                    _nodeLevel: 0,            // 当前节点级别 默认0
                    _haveChild: false,        // 是否包含下级
                    _childs: []               // 子节点的数组
                };
                curNewNode = null;
                if (P.rootcode == newNode.supnodecode) {
                    newNode._parent = null;
                    newNode._nodeLevel = 1;
                    var len = this._methods._dtNodes.length;
                    if (len > 0) {
                        this._methods._dtNodes[len - 1]._lastFlag = false;
                        newNode._lastFlag = true;
                    } else {
                        newNode._firstFlag = true;
                        newNode._lastFlag = true;
                    };
                    this._methods._dtNodes.push(newNode);   // 添加到第一级中
                } else {
                    var curParent = this._methods._hsNodes[newNode.supnodecode];
                    newNode._parent = curParent;
                    newNode._nodeLevel = curParent._nodeLevel + 1;
                    if (curParent._haveChild) {
                        curParent._childs[curParent._childs.length - 1]._lastFlag = false;
                        newNode._lastFlag = true;
                    } else {
                        curParent._haveChild = true;
                        newNode._firstFlag = true;
                        newNode._lastFlag = true;
                    };
                    curParent._childs.push(newNode);  // 添加到父节点的子节点数组中
                };
                this._methods._hsNodes.add(newNode.nodecode, newNode);  // 加入HASH

                // 创建节点
                var curNodes = []; curNodes.push(newNode);
                var $appNode = $(this._methods._createNodes(curNodes));
                if (newNode.nodecode == P.rootcode) {
                    if (P.showroot) { this.sdpTree.find("#" + this.myFnId + "_sdptree_node_clip_" + P.rootcode).append($appNode); } else { this.sdpTree.append($appNode); };
                } else {
                    var $parent_clip = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_clip_" + newNode.supnodecode);
                    if ($parent_clip.length > 0) {
                        $parent_clip.append($appNode);
                    }
                    else {
                        $now_clip = $('<div id="' + this.myFnId + '_sdptree_node_clip_' + newNode.supnodecode + '" class="clipdiv" stype="clip" style="display: block" ></div>');
                        $now_clip.append($appNode);
                        this.sdpTree.find("#" + this.myFnId + "_sdptree_node_full_" + newNode.supnodecode).after($now_clip);
                    };
                };

                // 更新节点样式
                if (newNode.supnodecode == P.rootcode) {   // 上级为根节点的时候，直接更新前一个节点    
                    if (this._methods._dtNodes.length > 1) {
                        var _prevCode = this._methods._dtNodes[this._methods._dtNodes.length - 2].nodecode;
                        this._methods._updateNode(_prevCode);
                    };
                } else {                                             // 上级不为根节点时候，直接更新此上级节点
                    this._methods._updateNode(newNode.supnodecode);
                };

                // 绑定节点Hover事件
                $appNode.find("span[stype='node']").hover(function () {
                    var tmTitle = _this._methods._hsNodes[$(this).attr("id").replace(_this.myFnId + "_sdptree_node_span_", "")].nodetitle;
                    if (!tmTitle) { tmTitle = $.text(this); };
                    $(this).addClass("node_hover").attr("title", tmTitle);
                }, function () {
                    $(this).removeClass("node_hover").attr("title", "");
                });
            },

            // @ method: deleteNode()  删除树节点
            // @ depict: 删除指定节点编码的树节点
            // @ params: [string] nodeCode 节点编码
            // @ pbtype: 外部调用方法
            deleteNode: function (nodeCode) {
                if ($.isNull(nodeCode)) { return; };
                if (nodeCode == this.options.rootcode) {
                    this.clearAll();
                } else {
                    if (!this._methods._hsNodes[nodeCode]) { return; };
                    var removeNode = this._methods._hsNodes[nodeCode];
                    var prevNodeCode = this.getPrevNodeCode(nodeCode);
                    var tm2 = 0;

                    // 首先删除HASH表中的所有子节点 先不删除本身节点
                    if (removeNode._haveChild) {
                        for (var tm1 = 0; tm1 < removeNode._childs.length; tm1++) {
                            this._methods._removeHashNodes(removeNode._childs[tm1].nodecode);
                        };
                    };

                    // 移除dtNodes数组中的节点项
                    if (removeNode._parent) {
                        for (tm2 = 0; tm2 < removeNode._parent._childs.length; tm2++) {
                            if (removeNode._parent._childs[tm2].nodecode == nodeCode) {
                                removeNode._parent._childs.splice(tm2--, 1);
                                break;
                            };
                        };
                    } else {   // 根目录下的第一级
                        for (tm2 = 0; tm2 < this._methods._dtNodes.length; tm2++) {
                            if (this._methods._dtNodes[tm2].nodecode == nodeCode) {
                                this._methods._dtNodes.splice(tm2--, 1);
                                break;
                            };
                        };
                    };

                    // 移除DOM Node对象
                    var rmNodeFullDom = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_full_" + nodeCode);
                    var rmNodeClipDom = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_clip_" + nodeCode);
                    if (rmNodeFullDom.length > 0) { rmNodeFullDom.remove(); };
                    if (rmNodeClipDom.length > 0) { rmNodeClipDom.remove(); };

                    // 更新Node父节点的数据
                    var parentND = removeNode._parent;
                    if (!parentND) {
                        for (tm2 = 0; tm2 < this._methods._dtNodes.length; tm2++) {
                            this._methods._dtNodes[tm2]._firstFlag = (tm2 == 0) ? true : false;
                            this._methods._dtNodes[tm2]._lastFlag = (tm2 == (this._methods._dtNodes.length - 1)) ? true : false;
                        };
                    } else {
                        if (parentND._childs.length > 0) {
                            for (tm2 = 0; tm2 < parentND._childs.length; tm2++) {
                                parentND._childs[tm2]._firstFlag = (tm2 == 0) ? true : false;
                                parentND._childs[tm2]._lastFlag = (tm2 == (parentND._childs.length - 1)) ? true : false;
                            };
                        } else {
                            parentND._haveChild = false;
                        };
                    };

                    this._methods._hsNodes.remove(removeNode.nodecode);  // 从Hash表删除自己

                    // 更新节点样式
                    if (parentND) {
                        this._methods._updateNode(parentND.nodecode);    // 更新父级节点显示样式
                    } else {
                        this._methods._updateNode(prevNodeCode);         // 更新前一级节点显示样式
                    };
                };
            },

            // @ method: clearAll()  清空树节点
            // @ depict: 清空树所有节点包括参数
            // @ pbtype: public 外部调用方法
            clearAll: function () {
                this.focusNodeCode = null;
                this.curNodes = [];
                this._methods._myNodes = [];
                this._methods._dtNodes = null;
                this._methods._hsNodes = null;
                this.sdpTree.empty();
            },

            // @ method: getNode() 获取节点对象DIV
            // @ depict: 根据节点 NodeCode 来获取 
            // @ params: [string] nodeCode 节点编码
            // @ return: [object] 返回节点DOM元素对象
            // @ pbtype: 外部调用方法
            getNode: function (nodeCode) {
                var retNode = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_full_" + nodeCode);
                return ((retNode.length > 0) ? retNode[0] : null);
            },

            // @ method: getNodeParams() 获取节点的所有参数
            // @ depict: 根据节点 NodeCode 来获取 
            // @ params: [string] nodeCode 节点编码
            // @ return: [object] 返回节点参数对象
            // @ pbtype: 外部调用方法
            getNodeParams: function (nodeCode) {
                var retNodeItem = null;
                if (nodeCode == null) { return retNodeItem; };
                if (nodeCode == this.options.rootcode) {               // 树根节点
                    retNodeItem = new this.nodeItem();
                    retNodeItem.nodecode = this.options.rootcode;
                    retNodeItem.nodetext = this.options.roottext;
                    retNodeItem.nodeurl = this.options.rooturl;
                    retNodeItem.iconcollapse = this.options.rooticon;
                } else {                                               // 普通节点
                    retNodeItem = this._methods._hsNodes[nodeCode];    // 从数组中获取此节点的所有值
                };
                return retNodeItem;
            },

            // @ method: getNodeCode() 获取节点编码
            // @ depict: 根据节点对象(通过getNode() 方法获取的节点对象) 来获取此对象的节点ID
            // @ params: node  object 节点DOM对象
            // @ return: string  返回节点对象的ID
            // @ pbtype: 外部调用方法
            getNodeCode: function (node) {
                var retNodeCode = null;
                if (node) {
                    var tmID = $(node).attr("id");
                    if (tmID) {
                        retNodeCode = tmID.replace(this.myFnId + "_sdptree_node_full_", "");
                    };
                };
                return retNodeCode;
            },

            // @ method: getPrevNodeCode() 获取指定节点的前一个节点的节点编码NodeCode
            // @ depict: 根据指定的节点NodeCode来获取其前一个节点NodeCode 节点编码
            // @ params: nodeCode  string 指定的节点编码
            // @ return: string  返回指定的节点NodeCode的前一个节点编码NodeCode
            // @ pbtype: 外部调用方法
            getPrevNodeCode: function (nodeCode) {
                var _prevCode = null;
                var _curtNode = this._methods._hsNodes[nodeCode];
                if (_curtNode) {
                    if (_curtNode._firstFlag) { return _prevCode; };
                    if (_curtNode.supnodecode == this.options.rootcode) {
                        for (var tm0 = 0; tm0 < this._methods._dtNodes.length; tm0++) {
                            if (this._methods._dtNodes[tm0].nodecode == nodeCode) {
                                _prevCode = this._methods._dtNodes[tm0 - 1].nodecode;
                                break;
                            };
                        };
                    } else {
                        var _parentND = _curtNode._parent;
                        for (var tm1 = 0; tm1 < _parentND._childs.length; tm1++) {
                            if (_parentND._childs[tm1].nodecode == nodeCode) {
                                _prevCode = _parentND._childs[tm1 - 1].nodecode;
                                break;
                            };
                        };
                    };
                };
                return _prevCode;
            },

            // @ method: getNextNodeCode() 获取指定节点的下一个节点编码
            // @ depict: 根据指定的节点编码来获取其后一个节点编码NodeCode
            // @ params: nodeCode  string 指定的节点编码
            // @ return: object  返回指定的节点的后一个节点编码字符串
            // @ pbtype: 外部调用方法
            getNextNodeCode: function (nodeCode) {
                var _nextCode = null;
                var _curtNode = this._methods._hsNodes[nodeCode];
                if (_curtNode) {
                    if (_curtNode._lastFlag) { return _nextCode; };
                    if (_curtNode.supnodecode == this.options.rootcode) {
                        for (var tm0 = 0; tm0 < this._methods._dtNodes.length; tm0++) {
                            if (this._methods._dtNodes[tm0].nodecode == nodeCode) {
                                _nextCode = this._methods._dtNodes[tm0 + 1].nodecode;
                                break;
                            };
                        };
                    } else {
                        var _parentND = _curtNode._parent;
                        for (var tm1 = 0; tm1 < _parentND._childs.length; tm1++) {
                            if (_parentND._childs[tm1].nodecode == nodeCode) {
                                _nextCode = _parentND._childs[tm1 + 1].nodecode;
                                break;
                            };
                        };
                    };
                };
                return _nextCode;
            },

            // @ method: getParentNodeCode() 获取指定节点的父级节点编码
            // @ depict: 根据节点编码来获取其父级节点编码
            // @ params: nodeCode  string 指定的节点编码
            // @ return: string  返回指定的节点编码的父级节点编码
            // @ pbtype: 外部调用方法
            getParentNodeCode: function (nodeCode) {
                var _parentNodeCode = null;
                if (this._methods._hsNodes[nodeCode]) {
                    _parentNodeCode = this._methods._hsNodes[nodeCode].supnodecode;
                };
                return _parentNodeCode;
            },

            // @ method: getFocusNodeCode() 获取目录树当前获取到焦点的节点编码
            // @ depict: 获取当前目录中，获取到焦点的即选中的节点编码 NodeCode
            // @ return: string  返回节点编码字符串
            // @ pbtype: 外部调用方法
            getFocusNodeCode: function () {
                return this.focusNodeCode;
            },

            // @ method: getNodeLevel() 获取节点级别层次
            // @ depict: 根据节点编码来获取 此节点的层次级别
            // @ params: nodeCode  string 节点编码
            // @ return: number 节点层次级别,无效返回-1
            // @ pbtype: 外部调用方法
            getNodeLevel: function (nodeCode) {
                if (nodeCode == this.options.rootcode) {
                    return 0;
                } else {
                    if (this._methods._hsNodes[nodeCode]) {
                        return (this._methods._hsNodes[nodeCode])._nodeLevel;
                    } else {
                        return -1;
                    };
                };
            },

            // @ method: getNodeText() 获取节点文本值
            // @ depict: 根据节点编码来获取节点文本值
            // @ params: nodeCode  string 节点编码
            // @ return: string 节点文本值
            // @ pbtype: 外部调用方法
            getNodeText: function (nodeCode) {
                var tm_Node = this.getNode(nodeCode);
                if (tm_Node) { return $(tm_Node).text(); };
                return null;
            },

            // @ method: getNodeVal() 获取节点所有值
            // @ depict：根据节点编码 获取节点的所有值
            // @ params: nodeCode  string 节点编码
            // @ return: Array {} 节点数据数组对象
            // @ pbtype:  外部调用方法
            getNodeVal: function (nodeCode) {
                var curNodeItem = new this.nodeItem();
                if (nodeCode == this.options.rootcode) {
                    curNodeItem.nodecode = this.options.rootcode;
                    curNodeItem.nodetext = this.options.roottext;
                    curNodeItem.nodetitle = "";
                    curNodeItem.supnodecode = "";
                    curNodeItem.nodeurl = this.options.rooturl;
                    curNodeItem.iconexpand = this.options.rooticon;
                    curNodeItem.iconcollapse = this.options.rooticon;
                } else {
                    var tm_Node = this._methods._hsNodes[nodeCode];
                    if (tm_Node) {
                        curNodeItem.nodecode = tm_Node.nodecode;
                        curNodeItem.nodetext = tm_Node.nodecode;
                        curNodeItem.nodetitle = tm_Node.nodecode;
                        curNodeItem.supnodecode = tm_Node.nodecode;
                        curNodeItem.nodeurl = tm_Node.nodeurl;
                        curNodeItem.iconexpand = tm_Node.iconexpand;
                        curNodeItem.iconcollapse = tm_Node.iconcollapse;
                    };
                };
                return curNodeItem;
            },

            // @ method: hideNode() 隐藏指定节点
            // @ depict: 根据节点编码 执行隐藏指定树节点对象
            // @ params: nodeCode  string 节点编码
            // @ pbtype: 外部调用方法
            hideNode: function (nodeCode) {
                if (this.options.rootcode == nodeCode) { return; };
                var tm_MyNode = this.getNode(nodeCode);
                if (!tm_MyNode) { return; };
                var tm_SubNode = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_clip_" + nodeCode);
                $(tm_MyNode).hide();
                if (tm_SubNode.length > 0) { $(tm_SubNode).hide(); };
            },

            // @ method: showNode() 显示指定节点
            // @ depict: 根据节点编码 执行显示指定树节点对象
            // @ params: nodeCode  string 节点编码
            // @ pbtype: 外部调用方法
            showNode: function (nodeCode) {
                if (this.options.rootcode == nodeCode) { return; };
                var tm_MyNode = this.getNode(nodeCode);
                if (tm_MyNode) {
                    $(tm_MyNode).show();
                    this.collapseNode(nodeCode);
                };
            },

            // @ method: setShowTreeLine() 设置树节点连线显示与否
            // @ depict: 设置显示、隐藏节点连线 [此功能只有当树期初设置为显示树节点连线的时候才起作用]
            // @ params: boolValue  boolean  说明：true 表示显示连接线  false 表示不显示
            // @ pbtype: 外部调用方法
            setShowTreeLine: function (boolValue) {
                if (!this.options.showline) { return; };
                var plusList = this.sdpTree.find("span[stype='plus']");
                var lineList = this.sdpTree.find("span[stype='line']");
                var tm0 = 0;
                if ((boolValue) && boolValue == true) {
                    for (tm0 = 0; tm0 < plusList.length; tm0++) {
                        if ($(plusList[tm0]).prop("open")) {
                            if ($(plusList[tm0]).hasClass("node_expd_0n")) {
                                switch ($(plusList[tm0]).attr("collclass")) {
                                    case "node_plug_1l":
                                        $(plusList[tm0]).removeClass("node_plug_0n");
                                        $(plusList[tm0]).removeClass("node_expd_0n");
                                        $(plusList[tm0]).addClass("node_plug_1l");
                                        $(plusList[tm0]).addClass("node_expd_1l");
                                        break;
                                    case "node_plug_2b":
                                        $(plusList[tm0]).removeClass("node_plug_0n");
                                        $(plusList[tm0]).removeClass("node_expd_0n");
                                        $(plusList[tm0]).addClass("node_plug_2b");
                                        $(plusList[tm0]).addClass("node_expd_2b");
                                        break;
                                    case "node_plug_2t":
                                        $(plusList[tm0]).removeClass("node_plug_0n");
                                        $(plusList[tm0]).removeClass("node_expd_0n");
                                        $(plusList[tm0]).addClass("node_plug_2t");
                                        $(plusList[tm0]).addClass("node_expd_2t");
                                        break;
                                    case "node_plug_3a":
                                        $(plusList[tm0]).removeClass("node_plug_0n");
                                        $(plusList[tm0]).removeClass("node_expd_0n");
                                        $(plusList[tm0]).addClass("node_plug_3a");
                                        $(plusList[tm0]).addClass("node_expd_3a");
                                        break;
                                }
                            }
                        } else {
                            if ($(plusList[tm0]).hasClass("node_plug_0n")) {
                                $(plusList[tm0]).removeClass("node_plug_0n");
                                $(plusList[tm0]).addClass($(plusList[tm0]).attr("collclass"));
                            }
                        }
                    };
                    for (tm0 = 0; tm0 < lineList.length; tm0++) {
                        if (($(lineList[tm0]).hasClass("node_line_10")) && ($(lineList[tm0]).hasClass("nullimg"))) { $(lineList[tm0]).removeClass("nullimg"); };
                        if (($(lineList[tm0]).hasClass("node_line_11")) && ($(lineList[tm0]).hasClass("nullimg"))) { $(lineList[tm0]).removeClass("nullimg"); };
                        if (($(lineList[tm0]).hasClass("node_line_20")) && ($(lineList[tm0]).hasClass("nullimg"))) { $(lineList[tm0]).removeClass("nullimg"); };
                        if (($(lineList[tm0]).hasClass("node_line_21")) && ($(lineList[tm0]).hasClass("nullimg"))) { $(lineList[tm0]).removeClass("nullimg"); };
                        if (($(lineList[tm0]).hasClass("node_line_3n")) && ($(lineList[tm0]).hasClass("nullimg"))) { $(lineList[tm0]).removeClass("nullimg"); };
                    };
                } else {
                    for (tm0 = 0; tm0 < plusList.length; tm0++) {
                        var $plusObj = $(plusList[tm0]);
                        if ($plusObj.prop("open")) {
                            if ($plusObj.hasClass("node_expd_1l")) {
                                $plusObj.removeClass("node_plug_1l").removeClass("node_expd_1l").addClass("node_plug_0n").addClass("node_expd_0n").attr("collclass", "node_plug_1l");
                            } else if ($plusObj.hasClass("node_expd_2b")) {
                                $plusObj.removeClass("node_plug_2b").removeClass("node_expd_2b").addClass("node_plug_0n").addClass("node_expd_0n").attr("collclass", "node_plug_2b");
                            } else if ($plusObj.hasClass("node_expd_2t")) {
                                $plusObj.removeClass("node_plug_2t").removeClass("node_expd_2t").addClass("node_plug_0n").addClass("node_expd_0n").attr("collclass", "node_plug_2t");
                            } else if ($plusObj.hasClass("node_expd_3a")) {
                                $plusObj.removeClass("node_plug_3a").removeClass("node_expd_3a").addClass("node_plug_0n").addClass("node_expd_0n").attr("collclass", "node_plug_3a");
                            };
                        } else {
                            if ($plusObj.hasClass("node_plug_1l")) {
                                $plusObj.removeClass("node_plug_1l").addClass("node_plug_0n").attr("collclass", "node_plug_1l");
                            } else if ($plusObj.hasClass("node_plug_2b")) {
                                $plusObj.removeClass("node_plug_2b").addClass("node_plug_0n").attr("collclass", "node_plug_2b");
                            } else if ($plusObj.hasClass("node_plug_2t")) {
                                $plusObj.removeClass("node_plug_2t").addClass("node_plug_0n").attr("collclass", "node_plug_2t");
                            } else if ($plusObj.hasClass("node_plug_3a")) {
                                $plusObj.removeClass("node_plug_3a").addClass("node_plug_0n").attr("collclass", "node_plug_3a");
                            };
                        };
                    };
                    for (tm0 = 0; tm0 < lineList.length; tm0++) {
                        var $lineObj = $(lineList[tm0]);
                        if (($lineObj.hasClass("node_line_10")) && (!$lineObj.hasClass("nullimg"))) { $lineObj.addClass("nullimg"); };
                        if (($lineObj.hasClass("node_line_11")) && (!$lineObj.hasClass("nullimg"))) { $lineObj.addClass("nullimg"); };
                        if (($lineObj.hasClass("node_line_20")) && (!$lineObj.hasClass("nullimg"))) { $lineObj.addClass("nullimg"); };
                        if (($lineObj.hasClass("node_line_21")) && (!$lineObj.hasClass("nullimg"))) { $lineObj.addClass("nullimg"); };
                        if (($lineObj.hasClass("node_line_3n")) && (!$lineObj.hasClass("nullimg"))) { $lineObj.addClass("nullimg"); };
                    };
                };
            },

            // @ method: setShowNodeIcon() 设置树节点ICON小图标显示与否
            // @ depict：设置树节点是否显示ICON小图标
            // @ params: boolValue  boolean  说明：true 表示显示  false 表示不显示
            // @ pbtype: 外部调用方法
            setShowNodeIcon: function (boolValue) {
                var tmDisplay = ((boolValue) && boolValue == true) ? "inline-block" : "none";
                var tmIcons = this.sdpTree.find("span[stype='icon']");
                for (var tm0 = 0; tm0 < tmIcons.length; tm0++) { $(tmIcons[tm0]).css("display", tmDisplay); };
            },

            // @ method: setShowSelectBox() 设置树节点选择按钮显示与否
            // @ depict：设置树节点是否显示选择按钮(复选框或单选框)
            // @ params: [string]  checkType  显示按钮类型：空、radio、checkbox
            // @ pbtype: 外部调用方法
            setShowSelectBox: function (checkType) {
                if (!checkType) { checkType = ""; };
                if (checkType == "checkbox") {
                    this.options.selecttype = "checkbox";
                } else if (checkType == "radio") {
                    this.options.selecttype = "radio";
                } else {
                    this.options.selecttype = "";
                };

                var tmCheckNodes = null;
                if (this.options.selecttype) {
                    tmCheckNodes = this.sdpTree.find("span[stype='check']");
                    if (tmCheckNodes.length > 0) { tmCheckNodes.remove(); };
                    tmCheckNodes = this.sdpTree.find("span[stype='node']");
                    for (var tm0 = 0; tm0 < tmCheckNodes.length; tm0++) {
                        var tm_TitleNode = $(tmCheckNodes[tm0]).find("span[stype='text']");
                        var tm_NodeID = tm_TitleNode.attr("id").replace(this.myFnId + "_sdptree_node_text_", "");
                        if (this.options.selecttype == "checkbox") {
                            $(tm_TitleNode).before('<span class="checkbox" stype="check" id="' + this.myFnId + '_sdptree_node_chk_' + tm_NodeID + '" ></span>');
                        } else {
                            $(tm_TitleNode).before('<span class="radiobtn" stype="check" id="' + this.myFnId + '_sdptree_node_chk_' + tm_NodeID + '" ></span>');
                        };
                    };

                } else {
                    tmCheckNodes = this.sdpTree.find("span[stype='check']");
                    if (tmCheckNodes.length > 0) { tmCheckNodes.remove(); };
                }
            },

            // @ method: checkedAll() 全部选中
            // @ depict: 当树开始复选时，实现选中全部树节点 
            // @ pbtype: 外部调用方法
            checkedAll: function () {
                var _chkIcon = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_chk_" + this.options.rootcode);
                if ((_chkIcon) && _chkIcon.length > 0) {
                    this._methods._checkedNodes(_chkIcon, true, true);
                }
            },

            // @ method: unCheckAll() 取消选择
            // @ depict: 当树开始复选时，实现取消全部全部树节点的选中 
            // @ pbtype: 外部调用方法
            uncheckAll: function () {
                var _chkIcon = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_chk_" + this.options.rootcode);
                if ((_chkIcon) && _chkIcon.length > 0) {
                    this._methods._checkedNodes(_chkIcon, false, true);
                }
            },

            // @ method: setOneNodeChecked() 设置节点选中与否 注意：此方法只设置此单个的节点
            // @ depict: 根据节点编码来设置节点选择与否 只设置一个节点，下级不进行设置
            // @ params: [string] nodeCode  节点编码
            // @ params: [bool]   boolChecked 是否选中 说明：true 表示显示  false 表示不显示
            // @ pbtype: 外部调用方法
            setOneNodeChecked: function (nodeCode, boolChecked) {
                var boolVal = (boolChecked) ? true : false;
                var chkImg = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_chk_" + nodeCode);
                if ((chkImg) && chkImg.length > 0) {
                    if (boolVal == chkImg.prop("checked")) { return; };
                    if (this.options.selecttype == "radio") {
                        if (boolVal) {
                            var rdoAllIcon = this.sdpTree.find("span[stype='check']");
                            for (var _tt = 0; _tt < rdoAllIcon.length; _tt++) {
                                var _curRadio = $(rdoAllIcon[_tt]);
                                if (_curRadio.prop("checked")) {
                                    _curRadio.prop("checked", false).removeClass("radiobtn").removeClass("radiobtn_check").addClass("radiobtn");
                                };
                            };
                            chkImg.prop("checked", true).removeClass("radiobtn").removeClass("radiobtn_check").addClass("radiobtn_check");
                        } else {
                            chkImg.prop("checked", false).removeClass("radiobtn").removeClass("radiobtn_check").addClass("radiobtn");
                        }
                    } else if (this.options.selecttype == "checkbox") {
                        chkImg.removeClass("checkbox").removeClass("checkbox_check").addClass(((boolVal) ? "checkbox_check" : "checkbox")).prop("checked", boolVal);
                    };
                };
            },

            // @ method: setNodeChecked() 设置节点选中与否 注意：此方法会自动设置下级（根据级联选择的原则）
            // @ depict: 根据节点编码来设置节点选择与否 
            // @ params: [string] nodeCode  节点编码
            // @ params: [bool]   boolValue 是否选中 说明：true 表示显示  false 表示不显示
            // @ pbtype: 外部调用方法
            setNodeChecked: function (nodeCode, boolValue) {
                var boolVal = (boolValue) ? true : false;
                var chkImg = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_chk_" + nodeCode);
                if ((chkImg) && chkImg.length > 0) {
                    if (this.options.selecttype == "radio") {
                        if (boolVal == chkImg.prop("checked")) { return; };
                        if (boolVal) {
                            var rdoAllIcon = this.sdpTree.find("span[stype='check']");
                            for (var _tt = 0; _tt < rdoAllIcon.length; _tt++) {
                                var _curRadio = $(rdoAllIcon[_tt]);
                                if (_curRadio.prop("checked")) {
                                    _curRadio.prop("checked", false).removeClass("radiobtn").removeClass("radiobtn_check").addClass("radiobtn");
                                };
                            };
                            chkImg.prop("checked", true).removeClass("radiobtn").removeClass("radiobtn_check").addClass("radiobtn_check");
                        } else {
                            chkImg.prop("checked", false).removeClass("radiobtn").removeClass("radiobtn_check").addClass("radiobtn");
                        }
                    } else if (this.options.selecttype == "checkbox") {
                        this._methods._checkedNodes(chkImg, boolVal);
                    };
                };
            },

            // @ method: setNodeText() 设置节点文本值
            // @ depict：设置树节点内容文本标题
            // @ params: nodeCode     string  节点编码
            // @ params: nodeText   string  节点文本标题字符
            // @ pbtype: 外部调用方法
            setNodeText: function (nodeCode, nodeText) {
                var txtNode = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_text_" + nodeCode);
                if (txtNode.length > 0) {
                    if ($.isNull(nodeText)) { nodeText = ""; };
                    txtNode.text(nodeText);
                    if (nodeCode == this.options.rootcode) {
                        this.options.roottext = nodeText;
                    } else {
                        this._methods._hsNodes[nodeCode].nodetext = nodeText;
                    };
                };
            },

            // @ method: getNodeChecked() 获取节点是否选中
            // @ depict：获取节点是否选中
            // @ params: [string] nodeCode   节点编码
            // @ return: [bool]   isChecked  返回是否选中(布尔：true/false)
            // @ pbtype: 外部调用方法
            getNodeChecked: function (nodeCode) {
                var isChecked = false;
                var chkImg = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_chk_" + nodeCode);
                if ((chkImg) && chkImg.length > 0) {
                    isChecked = chkImg.prop("checked");
                } else {
                    var tgNd = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_span_" + tgNodeCode);
                    if ((tgNd) && tgNd.length > 0) {
                        isChecked = tgNd.hasClass("node_select");
                    }
                };
                return isChecked;
            },

            // @ method: getCheckedNodes_Array() 获取选中节点的数组 to Array()
            // @ depict：获取树所有选中的节点 返回 Array 数组 
            // @ return: Array 数组  每项根式 item [
            // @                                     (1、nodecode 节点编码),  
            // @                                     (2、nodename 节点文本),
            // @                                     (3、nodesupcode 上级编码)
            // @                                     (4、nodelevel 节点级别)
            // @                                   ]
            // @ pbtype: 外部调用方法
            getCheckedNodes_Array: function () {
                var chkNodeList = this.sdpTree.find("span[stype='check']");
                var retArray = new Array();
                var retCode = "", retText = "", retSupCode = "", retLevel = -1; curIcon = null;
                for (var tm1 = 0; tm1 < chkNodeList.length; tm1++) {
                    curIcon = $(chkNodeList[tm1]);
                    if (!curIcon.prop("checked")) { continue; };
                    retCode = curIcon.attr("id").replace(this.myFnId + "_sdptree_node_chk_", "");
                    if (this.options.rootcode == retCode) { continue; };
                    retText = curIcon.parent().text();
                    retSupCode = this._methods._hsNodes[retCode].supnodecode;
                    retLevel = this._methods._hsNodes[retCode]._nodeLevel;
                    retArray[retArray.length] = [retCode, retText, retSupCode, retLevel];
                };
                return retArray;
            },

            // @ method: getCheckedNodes_String() 获取选中节点的字符串
            // @ depict：获取树所有选中的节点 返回 string 字符串(拼接字符串) 
            // @ return：String 中的每项之间用小写的分号隔开
            // @         每项顺序：nodecode(节点编码),nodename(节点文本),nodesupcode(上级编码),nodelevel(节点级别);
            // @ pbtype: 外部调用方法
            getCheckedNodes_String: function () {
                var chkNodeList = this.sdpTree.find("span[stype='check']");
                var retString = [], curIcon = null;
                var retCode = "", retText = "", retSupCode = "", retLevel = "-1";
                for (var tm1 = 0; tm1 < chkNodeList.length; tm1++) {
                    curIcon = $(chkNodeList[tm1]);
                    if (!curIcon.prop("checked")) { continue; };
                    retCode = curIcon.attr("id").replace(this.myFnId + "_sdptree_node_chk_", "");
                    if (this.options.rootcode == retCode) { continue; };
                    retText = curIcon.parent().text();
                    retSupCode = this._methods._hsNodes[retCode].supnodecode;
                    retLevel = this._methods._hsNodes[retCode]._nodeLevel;
                    retString.push(retCode + "," + retText + "," + retSupCode + "," + retLevel + ";");
                };
                return retString.join("");
            },

            // @ method: getCheckedNodes_JsonObj() 获取选中节点的JSON数组
            // @ depict：获取树所有选中的节点   返回 Json 对象数组 
            // @ return: JSON 对象数组
            // @         每项 item{ 
            // @                     nodecode: "节点编码",
            // @                     nodename: "节点文本", 
            // @                     supnodecode: "上级编码",
            // @                     nodelevel：节点级别
            // @                   }
            // @ pbtype: 外部调用方法
            getCheckedNodes_JsonObj: function () {
                var chkNodeList = this.sdpTree.find("span[stype='check']");
                var retJson = new Array();
                var retCode = "", retText = "", retSupCode = "", retLevel = 0, curIcon = null;
                for (var tm1 = 0; tm1 < chkNodeList.length; tm1++) {
                    curIcon = $(chkNodeList[tm1]);
                    if (!curIcon.prop("checked")) { continue; };
                    retCode = curIcon.attr("id").replace(this.myFnId + "_sdptree_node_chk_", "");
                    if (this.options.rootcode == retCode) { continue; };
                    retText = curIcon.parent().text();
                    retSupCode = this._methods._hsNodes[retCode].supnodecode;
                    retLevel = this._methods._hsNodes[retCode]._nodeLevel;
                    var newItem = {
                        nodecode: retCode,
                        nodetext: retText,
                        supnodecode: retSupCode,
                        nodelevel: retLevel
                    };
                    retJson.push(newItem);
                };
                return retJson;
            },

            // @ method: getCheckedNodes_XmlStr() 获取树所有选中的节点XML字符串
            // @ depict：获取树所有选中的节点生成固定格式的XML字符串 
            // @ return: XML字符串
            // @         每项 <row>
            // @                   <nodecode><![CDATA[节点编码]]></nodecode>
            // @                   <nodetext><![CDATA[节点文本]]></nodetext>
            // @                   <supnodecode><![CDATA[上级编码]]></supnodecode>
            // @                   <nodelevel><![CDATA[节点级别]]></nodelevel>
            // @               </row>
            // @ pbtype:  外部调用方法
            getCheckedNodes_XmlStr: function () {
                var chkNodeList = this.sdpTree.find("span[stype='check']");
                var retXml = ["<root>"];
                var retCode = "", retText = "", retSupCode = "", retLevel = 0, curIcon = null;
                for (var tm1 = 0; tm1 < chkNodeList.length; tm1++) {
                    curIcon = $(chkNodeList[tm1]);
                    if (!curIcon.prop("checked")) { continue; };
                    retCode = curIcon.attr("id").replace(this.myFnId + "_sdptree_node_chk_", "");
                    if (this.options.rootcode == retCode) { continue; };
                    retText = curIcon.parent().text();
                    retSupCode = this._methods._hsNodes[retCode].supnodecode;
                    retLevel = this._methods._hsNodes[retCode]._nodeLevel;
                    retXml.push("<row><nodecode><![CDATA[" + retCode + "]]></nodecode><nodetext><![CDATA[" + retText + "]]></nodetext><supnodecode><![CDATA[" + retSupCode + "]]></supnodecode><nodelevel><![CDATA[" + retLevel + "]]></nodelevel></row>");
                };
                retXml.push("</root>");
                return retXml.join("");
            },

            // @ method: getCheckedNodes_Hash() 获取树所有选中的节点HASH数组
            // @ depict：获取树所有选中的节点 返回Hash 数组 
            // @ return: Hash 中的每项：Hash.add(key=nodeID,value=nodeText);
            // @         item[key:nodeID] = value:nodeText
            // @         根据key: hash[key] 获取返回值：value
            // @ pbtype: 外部调用方法
            getCheckedNodes_Hash: function () {
                var chkNodeList = this.sdpTree.find("span[stype='check']");
                var retHash = $.Hashtable();
                var retCode = "", retText = "", curIcon = null;
                for (var tm1 = 0; tm1 < chkNodeList.length; tm1++) {
                    curIcon = $(chkNodeList[tm1]);
                    if (!curIcon.prop("checked")) { continue; };
                    retCode = curIcon.attr("id").replace(this.myFnId + "_sdptree_node_chk_", "");
                    if (this.options.rootcode == retCode) { continue; };
                    retText = curIcon.parent().text();
                    retHash.add(retCode, retText);
                };
                return retHash;
            },

            // @ method: getAllNodes_Hash() 获取树所有节点HASH数组
            // @ depict：获取树所有节点HASH数组 返回Hash 数组 
            // @ return: Hash 中的每项：Hash.add(key=nodeID,value=nodeText);
            // @         item[key:nodeID] = value:nodeText
            // @         根据key: hash[key] 获取返回值：value
            // @ pbtype:  外部调用方法
            getAllNodes_Hash: function () {
                return this._methods._hsNodes;
            },

            // @ method: getAllNodes_Array() 获取树所有节点Array数组[分级的]
            // @ depict：获取树所有节点 返回 Array 数组  
            // @ pbtype:  外部调用方法
            getAllNodes_Array: function () {
                return this._methods._dtNodes;
            },

            // @ method: expandNode() 展开所有节点
            // @ depict: 展开目录树的所有节点
            // @ pbtype: 外部调用方法
            expandAll: function () {
                for (var tm0 = 0; tm0 < this._methods._dtNodes.length; tm0++) {
                    var tm_ExpNode = this._methods._dtNodes[tm0];
                    if (tm_ExpNode._haveChild) {
                        this.expandNode(tm_ExpNode.nodecode);
                        this.expandAllChilds(tm_ExpNode.nodecode);
                    };
                };
            },

            // @ method: expandAllChilds() 展开指定节点的所有子节点
            // @ depict: 展开目录树的中执行节点下的所有子节点
            // @ params: nodeCode  string 节点编码
            // @ pbtype: 外部调用方法
            expandAllChilds: function (nodeCode) {
                var tsNode = this._methods._hsNodes[nodeCode];
                if (tsNode._haveChild) {
                    for (var tm2 = 0; tm2 < tsNode._childs.length; tm2++) {
                        var subNode = tsNode._childs[tm2];
                        if (subNode._haveChild) {
                            this.expandNode(subNode.nodecode);
                            this.expandAllChilds(subNode.nodecode);
                        };
                    };
                };
            },

            // @ method: expandNode() 展开指定的节点
            // @ depict: 根据节点编码 执行展开此节点
            // @ params: nodeCode  string 节点编码
            // @ pbtype: 外部调用方法
            expandNode: function (nodeCode) {
                var $plusImg = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_plus_" + nodeCode);
                var $clipDiv = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_clip_" + nodeCode);
                var $nodeIcn = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_icon_" + nodeCode);
                if ($plusImg.length > 0) {
                    if ($plusImg.hasClass("node_plug_0n")) {
                        if (!$plusImg.hasClass("node_expd_0n")) { $plusImg.addClass("node_expd_0n").prop("open", true); };
                    } else if ($plusImg.hasClass("node_plug_1l")) {
                        if (!$plusImg.hasClass("node_expd_1l")) { $plusImg.addClass("node_expd_1l").prop("open", true); };
                    } else if ($plusImg.hasClass("node_plug_2b")) {
                        if (!$plusImg.hasClass("node_expd_2b")) { $plusImg.addClass("node_expd_2b").prop("open", true); };
                    } else if ($plusImg.hasClass("node_plug_2t")) {
                        if (!$plusImg.hasClass("node_expd_2t")) { $plusImg.addClass("node_expd_2t").prop("open", true); };
                    } else if ($plusImg.hasClass("node_plug_3a")) {
                        if (!$plusImg.hasClass("node_expd_3a")) { $plusImg.addClass("node_expd_3a").prop("open", true); };
                    };
                };

                if ($clipDiv.length > 0) { $clipDiv.css("display", "block"); };
                if ($nodeIcn.length > 0) {
                    if ($nodeIcn.hasClass("custom_img")) {
                        var icnBgImg = ($nodeIcn.attr("expdimg")) ? $nodeIcn.attr("expdimg") : $nodeIcn.attr("collimg");
                        $nodeIcn.css("background-image", "url(" + icnBgImg + ")");
                    } else {
                        if (($nodeIcn.hasClass("folder_collapse")) && (!$nodeIcn.hasClass("folder_expand"))) { $nodeIcn.addClass("folder_expand"); };
                    }
                };
            },

            // @ method: collapseAll() 收缩所有节点
            // @ depict: 收缩目录树的所有节点
            // @ pbtype: 外部调用方法
            collapseAll: function () {
                for (var tm0 = 0; tm0 < this._methods._dtNodes.length; tm0++) {
                    var tm_CollNode = this._methods._dtNodes[tm0];
                    if (tm_CollNode._haveChild) {
                        this.collapseNode(tm_CollNode.nodecode);
                        this.collapseAllChilds(tm_CollNode.nodecode);
                    };
                };
            },

            // @ method: collapseAllChilds() 收缩指定节点的所有子节点
            // @ depict: 收缩目录树的中执行节点下的所有子节点
            // @ params: nodeCode  string 节点编码
            // @ pbtype: 外部调用方法
            collapseAllChilds: function (nodeCode) {
                var tsNode = this._methods._hsNodes[nodeCode];
                if (tsNode._haveChild) {
                    for (var tm2 = 0; tm2 < tsNode._childs.length; tm2++) {
                        var subNode = tsNode._childs[tm2];
                        if (subNode._haveChild) {
                            this.collapseNode(subNode.nodecode);
                            this.collapseAllChilds(subNode.nodecode);
                        };
                    };
                };
            },

            // @ method: collapseNode() 收缩指定的节点
            // @ depict: 根据节点编码收缩此节点 
            // @ params: nodeCode  string 节点编码
            // @ pbtype: 外部调用方法
            collapseNode: function (nodeCode) {
                var $plusImg = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_plus_" + nodeCode);
                var $clipDiv = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_clip_" + nodeCode);
                var $nodeIcn = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_icon_" + nodeCode);
                if ($plusImg.length > 0) {
                    if ($plusImg.hasClass("node_plug_0n")) {
                        if ($plusImg.hasClass("node_expd_0n")) { $plusImg.removeClass("node_expd_0n").prop("open", false); };
                    } else if ($plusImg.hasClass("node_plug_1l")) {
                        if ($plusImg.hasClass("node_expd_1l")) { $plusImg.removeClass("node_expd_1l").prop("open", false); };
                    } else if ($plusImg.hasClass("node_plug_2b")) {
                        if ($plusImg.hasClass("node_expd_2b")) { $plusImg.removeClass("node_expd_2b").prop("open", false); };
                    } else if ($plusImg.hasClass("node_plug_2t")) {
                        if ($plusImg.hasClass("node_expd_2t")) { $plusImg.removeClass("node_expd_2t").prop("open", false); };
                    } else if ($plusImg.hasClass("node_plug_3a")) {
                        if ($plusImg.hasClass("node_expd_3a")) { $plusImg.removeClass("node_expd_3a").prop("open", false); };
                    };
                };
                if ($clipDiv.length > 0) { $clipDiv.css("display", "none"); };
                if ($nodeIcn.length > 0) {
                    if ($nodeIcn.hasClass("custom_img")) {
                        var icnBgImg = ($nodeIcn.attr("collimg")) ? $nodeIcn.attr("collimg") : $nodeIcn.attr("expdimg");
                        $nodeIcn.css("background-image", "url(" + icnBgImg + ")");
                    } else {
                        if (($nodeIcn.hasClass("folder_collapse")) && ($nodeIcn.hasClass("folder_expand"))) {
                            $nodeIcn.removeClass("folder_expand");
                        }
                    }
                };
            },

            // @ method: expandLevel() 展开目录树中某层次所有节点 
            // @ depict: 根据节点层次级别
            // @ params: levelNum  [number]  节点层次级别[注意级别是从1开始,根目录属于0级]
            // @ pbtype: 外部调用方法
            expandLevel: function (levelNum) {
                levelNum = parseInt(levelNum, 10);
                if (isNaN(levelNum)) { return; };
                var _treeNodesHash = this._methods._hsNodes;
                for (var ll = 1; ll <= levelNum; ll++) {
                    for (var ndCode in _treeNodesHash) {
                        if (_treeNodesHash.hasOwnProperty(ndCode)) {
                            var ndItem = _treeNodesHash[ndCode];
                            if (ndItem._nodeLevel == ll) {
                                this.expandNode(ndItem.nodecode);
                            }
                        }
                    };
                };
            },

            // @ method: collapseLevel() 收缩目录树中某层次所有节点 
            // @ depict: 根据节点层次级别
            // @ params: levelNum  [number]  节点层次级别[注意级别是从1开始，根目录属于0级]
            // @ pbtype: 外部调用方法
            collapseLevel: function (levelNum) {
                levelNum = parseInt(levelNum, 10);
                if (isNaN(levelNum)) { return; };

                var _treeNodesHash = this._methods._hsNodes;
                for (var ndCode in _treeNodesHash) {
                    if (_treeNodesHash.hasOwnProperty(ndCode)) {
                        var ndItem = _treeNodesHash[ndCode];
                        if (ndItem._nodeLevel == levelNum) {
                            this.collapseNode(ndItem.nodecode); // 收缩指定的节点
                        }
                    }
                };
            },

            // @ method: getObject() 获取控件JQUERY 对象
            // @ depict: 获取插件所对应的DOM 控件 JQUERY 对象
            // @ return: [object]  返回控件JQUERY 对象 空为null
            // @ pbtype: 外部调用方法
            getObject: function () {
                return this.myObject;
            },

            // @ method: getID() 获取控件ID
            // @ depict: 获取此插件对应的控件ID属性值
            // @ return: [string] 控件ID
            // @ pbtype: 外部调用方法
            getID: function () {
                var _thisID = null;
                if (this.myObject != null) { _thisID = this.myObject.attr("id"); };
                if ($.isNull(_thisID) == true) { _thisID = null; };
                return _thisID;
            },

            // @ method: getSdpID() 获取控件内嵌 ID
            // @ depict: 获取此插件对应的控件SDP ID属性值
            // @ pbtype: 外部调用方法
            getSdpID: function () {
                var _thisSdpID = null;
                if (this.myObject != null) { _thisSdpID = this.myObject.attr("sdpid"); };
                if ($.isNull(_thisSdpID) == true) { _thisSdpID = null; };
                return _thisSdpID;
            },

            // @ method: onLocked() 锁定控件
            // @ depict: 执行控件的锁定
            // @ pbtype: 外部调用方法
            onLocked: function () {
                if (this.myObject == null) { return; };
                if (this.getLocked() == false) {
                    this.myObject.attr("sdplocked", "yes");
                }
            },

            // @ method: onUnLock() 解锁控件
            // @ depict: 执行控件的锁定
            // @ pbtype: 外部调用方法
            onUnLock: function () {
                if (this.myObject == null) { return; };
                if (this.getLocked() == true) {
                    this.myObject.attr("sdplocked", "no");
                }
            },

            // @ method: getLocked() 获取控件是否锁定
            // @ depict: 获取控件的锁定状态
            // @ return: [bool] 控件锁定状态 true false
            // @ pbtype: 外部调用方法
            getLocked: function () {
                if (this.myObject) {
                    return (this.myObject.attr("sdplocked") == "yes");
                } else {
                    return false;
                }
            },

            // @ method: getVisible() 获取控件是否可见
            // @ depict: 获取控件的可见状态（显示/隐藏）
            // @ return: [bool] 控件锁定状态 true: 表示显示（可见）; false：表示隐藏（不可见）
            // @ pbtype: 外部调用方法
            getVisible: function () {
                if (this.myObject != null) {
                    return this.myObject.is(":hidden");
                } else {
                    return true;
                }
            },

            // @ method: onRefresh() 树刷新
            // @ depict: 目录树刷新[当前树是通过自动加载的时,即从SQL中获取有效]
            // @ pbtype: 外部调用方法
            onRefresh: function () {
                var P = this.options;
                this.focusNodeCode = "";
            },

            // @ method: _loadParam() 加载控件Option参数
            // @ depict: 加载控件在设计器中Option参数
            // @ pbtype: 内部调用方法
            _loadParam: function () {
                this.options = $.extend({}, this.defaults);  // 合并参数
            },

            // @ method: _bindEvent() 事件绑定
            // @ depict: 执行控件 样式、事件等绑定
            // @ pbtype: 内部调用方法
            _bindEvent: function () {
                if (!this.myContainer) { return; };
                var _this = this;
                this.myContainer.click(function (event) {
                    _this._onClickHandle(event);
                }).dblclick(function (event) {
                    _this._onDblClickHandle(event);
                }).contextmenu(function (event) {
                    return false;
                });
            },

            // @ method: _onClickHandle() 节点单击事件处理
            // @ depict: 对目录树节点的单击事件处理
            // @ params: [object] event 当前目标对象(DOM)
            // @ pbtype: 内部调用方法
            _onClickHandle: function (event) {
                var e = window.event || event;
                e = e.srcElement || e.target;
                if (e.tagName.toLowerCase() != "span") { return; };
                var tgObj = $(e);
                var tgNodeCode = null, tgNd = null;
                switch (tgObj.attr("stype")) {
                    case "text":
                        tgNodeCode = tgObj.attr("id").replace(this.myFnId + "_sdptree_node_text_", "");
                        tgNd = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_span_" + tgNodeCode);
                        if (!tgNd.hasClass("node_select")) {
                            tgNd.addClass("node_select");
                            var forFocus = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_span_" + this.focusNodeCode);
                            if (forFocus.length > 0) { forFocus.removeClass("node_select"); };
                            this.focusNodeCode = tgNodeCode;
                        };
                        this._onNodeClick(tgNd);
                        break;
                    case "plus":
                        tgNodeCode = tgObj.attr("id").replace(this.myFnId + "_sdptree_node_plus_", "");
                        if (typeof (tgObj.prop("open")) == "undefined") {
                            if (tgObj.hasClass("node_plug_0n")) {
                                if (tgObj.hasClass("node_expd_0n")) { tgObj.prop("open", true); } else { tgObj.prop("open", false); };
                            } else if (tgObj.hasClass("node_plug_1l")) {
                                if (tgObj.hasClass("node_expd_1l")) { tgObj.prop("open", true); } else { tgObj.prop("open", false); };
                            } else if (tgObj.hasClass("node_plug_2b")) {
                                if (tgObj.hasClass("node_expd_2b")) { tgObj.prop("open", true); } else { tgObj.prop("open", false); };
                            } else if (tgObj.hasClass("node_plug_2t")) {
                                if (tgObj.hasClass("node_expd_2t")) { tgObj.prop("open", true); } else { tgObj.prop("open", false); };
                            } else if (tgObj.hasClass("node_plug_3a")) {
                                if (tgObj.hasClass("node_expd_3a")) { tgObj.prop("open", true); } else { tgObj.prop("open", false); };
                            };
                        };
                        if (tgObj.prop("open")) { this.collapseNode(tgNodeCode); } else { this.expandNode(tgNodeCode); };
                        break;
                    case "check":
                        if (this.getLocked() == true) { return; };
                        tgNodeCode = tgObj.attr("id").replace(this.myFnId + "_sdptree_node_chk_", "");
                        tgNd = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_span_" + tgNodeCode);
                        var _oldCheckState = tgObj.prop("checked") || false;
                        this.setNodeChecked(tgNodeCode, !tgObj.prop("checked"));
                        var _newCheckState = tgObj.prop("checked") || false;
                        if (_oldCheckState != _newCheckState) { this._onNodeCheckedChange(tgNd); };
                        break;
                };
            },

            // @ method: _onDblClickHandle() 节点双击事件处理
            // @ depict: 对目录树节点的双击事件处理
            // @ params: [object] event 当前目标对象(DOM)
            // @ pbtype: 内部调用方法
            _onDblClickHandle: function (event) { // 节点双击事件
                var e = event || window.event;
                e = e.srcElement || e.target;
                if (e.tagName.toLowerCase() != "span") { return; };
                var dblOBJ = $(e);
                if (dblOBJ.attr("stype") == "text") {
                    var dblNodeCode = dblOBJ.attr("id").replace(this.myFnId + "_sdptree_node_text_", "");
                    var plusOBJ = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_plus_" + dblNodeCode);
                    var tgNd = this.sdpTree.find("#" + this.myFnId + "_sdptree_node_span_" + dblNodeCode);
                    if (plusOBJ.length > 0) {
                        if (typeof (plusOBJ.prop("open")) == "undefined") {
                            if (plusOBJ.hasClass("node_plug_0n")) {
                                if (plusOBJ.hasClass("node_expd_0n")) { plusOBJ.prop("open", true); } else { plusOBJ.prop("open", false); };
                            } else if (plusOBJ.hasClass("node_plug_1l")) {
                                if (plusOBJ.hasClass("node_expd_1l")) { plusOBJ.prop("open", true); } else { plusOBJ.prop("open", false); };
                            } else if (plusOBJ.hasClass("node_plug_2b")) {
                                if (plusOBJ.hasClass("node_expd_2b")) { plusOBJ.prop("open", true); } else { plusOBJ.prop("open", false); };
                            } else if (plusOBJ.hasClass("node_plug_2t")) {
                                if (plusOBJ.hasClass("node_expd_2t")) { plusOBJ.prop("open", true); } else { plusOBJ.prop("open", false); };
                            } else if (plusOBJ.hasClass("node_plug_3a")) {
                                if (plusOBJ.hasClass("node_expd_3a")) { plusOBJ.prop("open", true); } else { plusOBJ.prop("open", false); };
                            };
                        };
                        if (plusOBJ.prop("open")) {
                            this.collapseNode(dblNodeCode);
                        }
                        else { this.expandNode(dblNodeCode); };
                    };
                    this._onNodeDblClick(tgNd);
                };
            },

            // @ method: _onNodeClick() 执行节点自定单击事件
            // @ depict: 执行节点自定单击事件
            // @ params: [object] node 树节点DOM对象 
            // @ pbtype: 内部调用方法
            _onNodeClick: function (node) {
                if (!node) { return; };
                var nodeClickEvent = this.options.nodeclick;
                if (typeof (nodeClickEvent) != 'function') { nodeClickEvent = $.strToFunction(nodeClickEvent); };
                if (typeof (nodeClickEvent) == 'function') {
                    try {
                        var ndCode = $(node).attr("id").replace(this.myFnId + "_sdptree_node_span_", "");
                        var ndItem = new this.nodeItem();
                        if (ndCode == this.options.rootcode) {
                            ndItem.nodecode = this.options.rootcode;
                            ndItem.nodetext = this.options.roottext;
                            ndItem.nodeurl = this.options.rooturl;
                            ndItem.iconcollapse = this.options.rooticon;
                        } else {
                            ndItem = this._methods._hsNodes[ndCode];
                        };

                        var eParams = {
                            treePlug: this,
                            nodeObject: $(node)[0],
                            nodeParams: ndItem
                        };
                        nodeClickEvent.call(null, eParams);
                    } catch (error) {
                        alert("控件单击事件执行错误！" + error);
                    }
                };
            },

            // @ method: _onNodeDblClick() 执行节点自定双击事件
            // @ depict: 执行节点自定双击事件
            // @ params: [object] node 树节点DOM对象
            // @ pbtype: 内部调用方法
            _onNodeDblClick: function (node) {
                if (!node) { return; };
                var nodeDblClickEvent = this.options.nodedblclick;
                if (typeof (nodeDblClickEvent) != 'function') { nodeDblClickEvent = $.strToFunction(nodeDblClickEvent); };
                if (typeof (nodeDblClickEvent) == 'function') {
                    try {
                        var ndCode = $(node).attr("id").replace(this.myFnId + "_sdptree_node_span_", "");
                        var ndItem = new this.nodeItem();
                        if (ndCode == this.options.rootcode) {
                            ndItem.nodecode = this.options.rootcode;
                            ndItem.nodetext = this.options.roottext;
                            ndItem.nodeurl = this.options.rooturl;
                            ndItem.iconcollapse = this.options.rooticon;
                        } else {
                            ndItem = this._methods._hsNodes[ndCode];
                        };
                        var eParams = {
                            treePlug: this,
                            nodeObject: $(node)[0],
                            nodeParams: ndItem
                        };
                        nodeDblClickEvent.call(null, eParams);
                    } catch (error) {
                        alert("控件双击事件执行错误！" + error);
                    }
                };
            },

            // @ method: _onNodeCheckedChange() 执行节点自定选择（选中状态）改变事件
            // @ depict: 执行节点自定选择（选中状态）改变事件
            // @ params: [object] node 树节点DOM对象
            // @ pbtype: 内部调用方法
            _onNodeCheckedChange: function (node) {
                if (!node) { return; };
                var nodeCheckedChange = this.options.checkedchange;
                if (typeof (nodeCheckedChange) != 'function') { nodeCheckedChange = $.strToFunction(nodeCheckedChange); };
                if (typeof (nodeCheckedChange) == 'function') {
                    try {
                        var ndCode = $(node).attr("id").replace(this.myFnId + "_sdptree_node_span_", "");
                        var ndItem = new this.nodeItem();
                        if (ndCode == this.options.rootcode) {
                            ndItem.nodecode = this.options.rootcode;
                            ndItem.nodetext = this.options.roottext;
                            ndItem.nodeurl = this.options.rooturl;
                            ndItem.iconcollapse = this.options.rooticon;
                        } else {
                            ndItem = this._methods._hsNodes[ndCode];
                        };
                        var eParams = {
                            treePlug: this,
                            nodeObject: $(node)[0],
                            nodeParams: ndItem
                        };
                        nodeCheckedChange.call(null, eParams);
                    } catch (error) {
                        alert("控件双击事件执行错误！" + error);
                    }
                };
            },

            _methods: {
                _fnObject: null,
                _myObject: null,
                _myContainer: null,
                _myFnId: "",
                _sdpTree: null,
                _myNodes: [],
                _hsNodes: null,
                _dtNodes: null,
                _createTree: function () {    // 创建树HTML对象
                    // 初始化变量参数
                    this._sdpTree.empty();       // 清空目录树内的所有内容
                    this._fnObject.focusNodeCode = "";
                    this._myNodes = [];
                    this._hsNodes = new $.Hashtable();
                    this._dtNodes = [];
                    var _tmNodes = [], F = this._fnObject, P = this._fnObject.options, _this = this;

                    // 重组目录节点（依次将所有的节点组成自己的树） 一次循环完成 提高效率
                    function Renew_GroupNodes(currNodes) {
                        // 重绘节点上下级关系
                        function Renew_Tree(reNode) {
                            if (_tmNodes[reNode.nodecode]) {
                                for (var n = 0; n < _tmNodes[reNode.nodecode].length; n++) {
                                    reNode._childs[n] = _tmNodes[reNode.nodecode][n];
                                    reNode._childs[n]._parent = reNode;
                                    reNode._childs[n]._firstFlag = (n == 0) ? true : false;
                                    reNode._childs[n]._lastFlag = (n == (_tmNodes[reNode.nodecode].length - 1)) ? true : false;
                                    reNode._childs[n]._haveChild = (_tmNodes[_tmNodes[reNode.nodecode][n].nodecode]) ? true : false;
                                    reNode._childs[n]._nodeLevel = reNode._nodeLevel + 1;
                                    Renew_Tree(_tmNodes[reNode.nodecode][n]);  // 迭代循环
                                }
                            }
                        };

                        var m = 0;
                        _tmNodes[P.rootcode] = [];   // 根节点
                        for (m = 0; m < currNodes.length; m++) {
                            var _nd = currNodes[m];
                            _tmNodes[_nd.supnodecode] = _tmNodes[_nd.supnodecode] || [];
                            _tmNodes[_nd.supnodecode].push(_nd);
                            _this._hsNodes.add(_nd.nodecode, _nd);
                        };
                        var _rtNodes = _tmNodes[P.rootcode];

                        for (m = 0; m < _rtNodes.length; m++) {
                            _this._dtNodes[m] = _rtNodes[m];
                            _this._dtNodes[m]._parent = null;
                            _this._dtNodes[m]._firstFlag = (m == 0) ? true : false;  // 设置参数
                            _this._dtNodes[m]._lastFlag = (m == (_rtNodes.length - 1)) ? true : false;
                            _this._dtNodes[m]._haveChild = (_tmNodes[_rtNodes[m].nodecode]) ? true : false;
                            _this._dtNodes[m]._nodeLevel = 1;
                            Renew_Tree(_rtNodes[m]);                               // 迭代循环
                        };

                        _rtNodes = null;
                        _tmNodes = null;
                    };

                    // 执行节点重组
                    Renew_GroupNodes(F.curNodes);
                    F.curNodes = [];  // 清空临时节点数组变量，便于后续重新加载使用

                    // 定义前缀字符
                    var full_Prefix = this._myFnId + "_sdptree_node_full";     // 完整的一个节点DIV（包含：连线、+号图片、节点图片、选择框、节点文本）
                    var node_Prefix = this._myFnId + "_sdptree_node_span";     // 节点SPAN
                    // var plus_Prefix = this._myFnId + "_sdptree_node_plus";     // + 号图片
                    var nimg_Prefix = this._myFnId + "_sdptree_node_icon";     // 节点图片
                    var chkr_Prefix = this._myFnId + "_sdptree_node_chk";      // 选择图片
                    var text_Prefix = this._myFnId + "_sdptree_node_text";     // 节点文本
                    var clip_Prefix = this._myFnId + "_sdptree_node_clip";     // 子节点DIV

                    // 注意点：前台传入的所有自定义的图标，全部已经是指定的完整路径了，所以这里就不需要转换
                    var _rootCode = P.rootcode;
                    if (P.showroot) {           // 判定是否显示根节点
                        var tmRhtml = [];
                        tmRhtml.push('<div id="' + full_Prefix + '_' + _rootCode + '" stype="full" >');
                        tmRhtml.push('<span id="' + node_Prefix + '_' + _rootCode + '" class="node_default" stype="node" >');
                        if (P.showicon) {
                            tmRhtml.push('<span id="' + nimg_Prefix + '_' + _rootCode + '" stype="icon" ');
                            if (P.rooticon) {   // 是否客户自定义的图片
                                tmRhtml.push('class="custom_img" style="background-image: url(' + (P.rooticon) + ');"');
                            } else {                                // 启用默认的样式图片
                                tmRhtml.push('class="root_img"');
                            };
                            tmRhtml.push(' ></span>');
                        };
                        if (P.selecttype == "checkbox") {     // 是否开启选择按钮
                            tmRhtml.push('<span id="' + chkr_Prefix + '_' + _rootCode + '" stype="check" class="checkbox"></span>');
                        } else if (P.selecttype == "radio") {
                            tmRhtml.push('<span id="' + chkr_Prefix + '_' + _rootCode + '" stype="check" class="radiobtn"></span>');
                        };
                        tmRhtml.push('<span id="' + text_Prefix + '_' + _rootCode + '"  class="root_title" stype="text">' + P.roottext + '</span>');
                        tmRhtml.push('</span>');
                        tmRhtml.push('</div>');
                        this._sdpTree.append($(tmRhtml.join("")));
                        tmRhtml = null;
                    };
                    var $clipDom = null;
                    if (P.showroot) $clipDom = $('<div id="' + clip_Prefix + '_' + _rootCode + '" class="clipdiv" stype="clip" style="display: block" ></div>');
                    var _recHTML = this._createNodes(this._dtNodes);
                    if (_recHTML) {
                        if ($clipDom) { $clipDom.append($(_recHTML)); this._sdpTree.append($clipDom); } else { this._sdpTree.append($(_recHTML)); };
                    } else {
                        if ($clipDom) { this._sdpTree.append($clipDom); };
                    };
                    _recHTML = null;

                    // 绑定事件
                    this._bindEvent();
                    if (P.openall) { F.expandAll(); };
                },
                _createNodes: function (crNodes) { // 创建节点HTML
                    var full_Prefix = this._myFnId + "_sdptree_node_full";     // 完整的一个节点DIV（包含：连线、+号图片、节点图片、选择框、节点文本）
                    var node_Prefix = this._myFnId + "_sdptree_node_span";     // 节点SPAN
                    var plus_Prefix = this._myFnId + "_sdptree_node_plus";     // + 号图片
                    var nimg_Prefix = this._myFnId + "_sdptree_node_icon";     // 节点图片
                    var chkr_Prefix = this._myFnId + "_sdptree_node_chk";      // 选择图片
                    var text_Prefix = this._myFnId + "_sdptree_node_text";     // 节点文本
                    var clip_Prefix = this._myFnId + "_sdptree_node_clip";     // 子节点DIV
                    var P = this._fnObject.options;                            // 参数变量

                    var tmHTML = [];
                    for (var m = 0; m < crNodes.length; m++) {
                        var crNode = crNodes[m];
                        tmHTML.push('<div id="' + full_Prefix + '_' + crNode.nodecode + '" stype="full" >');
                        var tmIndent = [];
                        var tmParent = crNode._parent;
                        var lv = crNode._nodeLevel;
                        while (lv > 1) { tmIndent[tmIndent.length] = tmParent; tmParent = tmParent._parent; lv--; };
                        for (lv = tmIndent.length - 1; lv >= 0; lv--) {
                            tmHTML.push('<span class="' + ((this._fnObject.options.showline == true) ? ((tmIndent[lv]._lastFlag == false) ? "node_line_10" : "nullimg") : "nullimg") + '" stype="line" ></span>');
                        };
                        tmIndent = null;
                        tmParent = null;
                        var tmNdCode = crNode.nodecode;
                        if (P.showline == true) {          // 2、节点自身图标 + - 
                            if (crNode._haveChild) {
                                if (crNode._nodeLevel == 1 && P.showroot == false && crNode._firstFlag == true) {
                                    tmHTML.push('<span id="' + plus_Prefix + '_' + tmNdCode + '"  stype="plus" class="' + ((crNode._lastFlag) ? "node_plug_1l" : "node_plug_2b") + '"></span>');
                                } else {
                                    tmHTML.push('<span id="' + plus_Prefix + '_' + tmNdCode + '"  stype="plus" class="' + ((crNode._lastFlag) ? "node_plug_2t" : "node_plug_3a") + '"></span>');
                                };
                            } else {
                                if (crNode._nodeLevel == 1 && P.showroot == false && crNode._firstFlag == true) {
                                    tmHTML.push('<span class="' + ((crNode._lastFlag) ? "node_line_11" : "node_line_20") + '" stype="line" ></span>');
                                } else {
                                    tmHTML.push('<span class="' + ((crNode._lastFlag) ? "node_line_21" : "node_line_3n") + '" stype="line" ></span>');
                                };
                            };

                        } else {   // 不显示线
                            var tmPlusStr = "stype=\"plus\" id=" + plus_Prefix + "_" + tmNdCode;
                            var tmLineStr = "stype=\"line\"";
                            tmHTML.push('<span class="' + ((crNode._haveChild == true) ? "node_plug_0n" : "nullimg") + '" ' + ((crNode._haveChild == true) ? tmPlusStr : tmLineStr) + ' ></span>');
                        };
                        tmHTML.push('<span id="' + node_Prefix + '_' + tmNdCode + '" class="node_default" stype="node" >');  // 3、添加节点相关

                        // 节点小图标
                        if (P.showicon) {

                            // 节点图标  根据每个节点自身是否定义 如果没有定义，再从OPTIONS 参数中查询
                            var cur_CollapseIcon = ""; //                    iconexpand: "",  iconcollapse: ""
                            var cur_ExpandIcon = "";
                            if ($.isNull(crNode.iconcollapse) == false) {  // 判定节点收缩时显示的图标
                                cur_CollapseIcon = crNode.iconcollapse;    // 默认显示图标[收缩]
                                cur_ExpandIcon = crNode.iconexpand;        // 展开显示图标[展开]
                            } else {
                                if (crNode._haveChild == true)             // 判定是否有子节点
                                {
                                    if ($.isNull(P.middefticon) == false) {
                                        cur_CollapseIcon = P.middefticon;   // 中间节点收缩[整体自定]
                                        cur_ExpandIcon = P.midexpdicon;     // 中间节点展开[整体自定]
                                    }
                                } else {
                                    if ($.isNull(P.endnodeicon) == false) {
                                        cur_CollapseIcon = P.endnodeicon;   // 末级节点[整体自定]
                                        cur_ExpandIcon = "";
                                    }
                                }
                            };

                            // 节点图片  
                            if ($.isNull(cur_CollapseIcon) == false) {
                                tmHTML.push('<span class="custom_img" id="' + nimg_Prefix + '_' + tmNdCode + '" stype="icon" collimg="' + cur_CollapseIcon + '" expdimg="' + cur_ExpandIcon + '" style="background-image: url(' + cur_CollapseIcon + ');"></span>');
                            } else {
                                tmHTML.push('<span class="' + ((crNode._haveChild == true) ? "folder_collapse" : "folder_last") + '" id="' + nimg_Prefix + '_' + tmNdCode + '" stype="icon"></span>');
                            };
                        };
                        if (P.selecttype == "checkbox") {   // 允许添加选择按钮
                            tmHTML.push('<span id="' + chkr_Prefix + '_' + tmNdCode + '" stype="check" class="checkbox" ></span>');
                        } else if (P.selecttype == "radio") {
                            tmHTML.push('<span id="' + chkr_Prefix + '_' + tmNdCode + '" stype="check" class="radiobtn" ></span>');
                        };
                        tmHTML.push('<span id="' + text_Prefix + '_' + tmNdCode + '" class="node_title" stype="text">' + crNode.nodetext + '</span>');      //  节点名称
                        tmHTML.push('</span>');
                        tmHTML.push('</div>');
                        if (crNode._childs.length > 0) {
                            tmHTML.push('<div id="' + clip_Prefix + '_' + tmNdCode + '" class="clipdiv" stype="clip"  style="display:none;" >');  // 第一级以下全部隐藏
                            tmHTML.push(this._createNodes(crNode._childs));
                            tmHTML.push('</div>');
                        };
                    };
                    return tmHTML.join("");
                },
                _updateNode: function (nodeCode) {            //  更新节点显示样式
                    var tmNowNode = this._hsNodes[nodeCode];  //  当前节点的Node数据
                    if (!tmNowNode) { return; };

                    // 1、首先更新自己
                    var nowFullNode = $(this._fnObject.getNode(nodeCode));                                       // 完整的节点对象
                    var nowSpanNode = nowFullNode.find("#" + this._myFnId + "_sdptree_node_span_" + nodeCode);   // 节点NODESPAN
                    var nowPlusSpan = nowSpanNode.prev();                                                        // 节点Plus + - 图标
                    var nowIconSpan = nowFullNode.find("#" + this._myFnId + "_sdptree_node_icon_" + nodeCode);   // 节点ICON 图标

                    var tmIndent = null, tmParent = null, lv = null, lineClass = "", tmI = 0;
                    if (!tmNowNode._haveChild) {  // 无子节点
                        // （1）、更新Plus
                        nowPlusSpan.removeAttr("id").removeAttr("open").attr("stype", "line");
                        if (this._fnObject.options.showline == true) {  // 显示连接线
                            var lineClassName = "";
                            if (tmNowNode._nodeLevel == 1 && this._fnObject.options.showroot == false && tmNowNode._firstFlag == true) {
                                lineClassName = (tmNowNode._lastFlag) ? "node_line_11" : "node_line_20";
                            } else {
                                lineClassName = (tmNowNode._lastFlag) ? "node_line_21" : "node_line_3n";
                            };
                            nowPlusSpan.attr("class", lineClassName); // 更新样式ClassName
                        } else {  // 不显示连接线
                            nowPlusSpan.attr("class", "nullimg");
                        };
                        // （2）、更新Icon
                        if (nowIconSpan.length > 0) {
                            if (!nowIconSpan.hasClass("custom_img")) { nowIconSpan.attr("class", "folder_last"); };
                        };

                        // （3）、更新Line
                        tmIndent = [];
                        tmParent = tmNowNode._parent;
                        lv = tmNowNode._nodeLevel;
                        while (lv > 1) { tmIndent[tmIndent.length] = tmParent; tmParent = tmParent._parent; lv--; };
                        lineClass = "", tmI = 0;
                        for (lv = tmIndent.length - 1; lv >= 0; lv--) {
                            lineClass = ((this._fnObject.options.showline == true) ? ((tmIndent[lv]._lastFlag == false) ? "node_line_10" : "nullimg") : "nullimg");
                            $(nowFullNode[0].childNodes[tmI]).attr("class", lineClass);
                            tmI++;
                        };

                        tmIndent = null;
                        tmParent = null;
                        lineClass = null;
                    } else {    // 有子节点
                        // （1）、更新Plus
                        var nowClipDiv = this._sdpTree.find("#" + this._myFnId + "_sdptree_node_clip_" + nodeCode);
                        var isOpen = (nowClipDiv.css("display") == "none") ? false : true;
                        nowPlusSpan.attr("id", this._myFnId + "_sdptree_node_plus_" + nodeCode).attr("stype", "plus");
                        if (isOpen) { nowPlusSpan.attr("open", true); } else { nowPlusSpan.attr("open", false); };  // 设置展开状态
                        if (this._fnObject.options.showline == true) {  // 显示连接线
                            var plusClassName = "";
                            if (tmNowNode._nodeLevel == 1 && this._fnObject.options.showroot == false && tmNowNode._firstFlag == true) {
                                plusClassName = (tmNowNode._lastFlag) ? "node_plug_1l" : "node_plug_2b";
                            } else { plusClassName = (tmNowNode._lastFlag) ? "node_plug_2t" : "node_plug_3a"; };
                            nowPlusSpan.attr("class", plusClassName);               // 设置Plus 收缩样式
                            if (isOpen) {
                                switch (plusClassName) {
                                    case "node_plug_1l":
                                        nowPlusSpan.addClass("node_expd_1l");
                                        break;
                                    case "node_plug_2b":
                                        nowPlusSpan.addClass("node_expd_2b");
                                        break;
                                    case "node_plug_2t":
                                        nowPlusSpan.addClass("node_expd_2t");
                                        break;
                                    case "node_plug_3a":
                                        nowPlusSpan.addClass("node_expd_3a");
                                        break;
                                };
                            };
                        } else {  // 不显示连接线
                            nowPlusSpan.attr("class", "node_plug_0n");              // 设置Plus 收缩样式
                            if (isOpen) nowPlusSpan.addClass("node_expd_0n");       // 添加Plus 展开样式
                        };

                        // （2）、更新Icon
                        if (nowIconSpan.length > 0) {
                            if (!nowIconSpan.hasClass("custom_img")) {
                                nowIconSpan.attr("class", "folder_collapse");            // 设置Icon 收缩样式 
                                if (isOpen) {                                            // 添加Icon 展开样式
                                    nowIconSpan.addClass("folder_expand");
                                };
                            };
                        };

                        // （3）、更新Line
                        tmIndent = [];
                        tmParent = tmNowNode._parent;
                        lv = tmNowNode._nodeLevel;
                        while (lv > 1) { tmIndent[tmIndent.length] = tmParent; tmParent = tmParent._parent; lv--; };
                        lineClass = "", tmI = 0;
                        for (lv = tmIndent.length - 1; lv >= 0; lv--) {
                            lineClass = ((this._fnObject.options.showline == true) ? ((tmIndent[lv]._lastFlag == false) ? "node_line_10" : "nullimg") : "nullimg");
                            $(nowFullNode[0].childNodes[tmI]).attr("class", lineClass);
                            tmI++;
                        };

                        tmIndent = null;
                        tmParent = null;
                        lineClass = null;
                    };

                    // 2、其次更新下级
                    if (tmNowNode._haveChild) {
                        for (var tm2 = 0; tm2 < tmNowNode._childs.length; tm2++) {
                            var tmSubNodeCode = tmNowNode._childs[tm2].nodecode;
                            this._updateNode(tmSubNodeCode); // 迭代循环更新子节点
                        };
                    };
                },

                // @ params: [bool]   isOpAll   是否全部 说明：前面调用时候，根据情况 是否执行全部节点的标志(一般使用于全部选中、取消选择使用)
                _checkedNodes: function (node, bool, isOpAll) {        // 设置多节点选中状态
                    this._checkedNode(node, bool);                     // 设置当前节点
                    if (this._fnObject.options.cascade || isOpAll) {   // 级联选择节点 或 前台必须要全部节点
                        var tm_Prefix = this._myFnId + "_sdptree_node_chk_";
                        var tm_NodeCode = node.attr("id").replace(tm_Prefix, "");
                        var tm_Flag = true;
                        if ((bool) && (tm_NodeCode != this._fnObject.options.rootcode)) {
                            var tm_pNodeCode = this._hsNodes[tm_NodeCode].supnodecode;      // 设置上级勾选
                            while (tm_Flag) {
                                var pNode = this._sdpTree.find("#" + tm_Prefix + tm_pNodeCode);
                                if (tm_pNodeCode == this._fnObject.options.rootcode) {
                                    if (!pNode.prop("checked")) { this._checkedNode(pNode, true); };
                                    tm_Flag = false;
                                    break;
                                } else {
                                    if (!pNode.prop("checked")) { this._checkedNode(pNode, true); };
                                    tm_pNodeCode = this._hsNodes[tm_pNodeCode].supnodecode;
                                };
                            };
                        };

                        // 设置下级勾选
                        var subNodes = null;
                        if (tm_NodeCode == this._fnObject.options.rootcode) { subNodes = this._dtNodes; } else { subNodes = this._hsNodes[tm_NodeCode]._childs; };
                        this._checkedSubNodes(subNodes, bool);
                        subNodes = null;
                    };
                },
                _checkedNode: function (node, bool) {
                    node.removeClass("checkbox").removeClass("checkbox_check").addClass(((bool) ? "checkbox_check" : "checkbox")).prop("checked", bool);
                },
                _checkedSubNodes: function (nodes, bool) {
                    if (!nodes) { return; };
                    for (var tm1 = 0; tm1 < nodes.length; tm1++) {
                        var tm_Node = this._sdpTree.find("#" + this._myFnId + "_sdptree_node_chk_" + nodes[tm1].nodecode);
                        if (tm_Node.length > 0) {
                            this._checkedNode(tm_Node, bool);
                            if (nodes[tm1]._childs) { this._checkedSubNodes(nodes[tm1]._childs, bool); };
                        };
                    };
                },
                _removeHashNodes: function (nodeCode) {
                    var rmNode = this._hsNodes[nodeCode];
                    if (!rmNode) { return; };
                    if (rmNode._haveChild) {
                        for (var tm2 = 0; tm2 < rmNode._childs.length; tm2++) {
                            this._removeHashNodes(rmNode._childs[tm2].nodecode);
                        };
                    };

                    this._hsNodes.remove(nodeCode);
                },
                _bindEvent: function () {
                    var this_myNodes = this._sdpTree.find("span[stype='node']");
                    var this_treeID = this._myFnId;
                    var this_rootNode = this._sdpTree.find("#" + this_treeID + "_sdptree_node_span_" + this._fnObject.options.rootcode);
                    var _this = this;

                    if (this_rootNode.length > 0) {
                        this_rootNode.hover(function () {
                            $(this).addClass("node_hover").attr("title", $.text(this));
                        }, function () {
                            $(this).removeClass("node_hover").attr("title", "");
                        });
                    };
                    if (this_myNodes.length == 0) { return; };
                    this_myNodes.hover(function () {   // 性能比较 此方法直接绑定hover 比 $().each() 方法耗时少很多
                        var tmThisNode = _this._hsNodes[$(this).attr("id").replace(this_treeID + "_sdptree_node_span_", "")];
                        var tmTitle = "";
                        if (tmThisNode) { tmTitle = tmThisNode.nodetitle; };
                        if (!tmTitle) { tmTitle = $.text(this); };
                        $(this).addClass("node_hover").attr("title", tmTitle);
                    }, function () {
                        $(this).removeClass("node_hover").attr("title", "");
                    });
                }
            }
        };
    };
})(jQuery);