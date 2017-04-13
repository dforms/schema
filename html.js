"use strict";

var conditions = [];

function classof(o) {
    if (o === null) return "Null";
    if (o === undefined) return "Undefined";
    return Object.prototype.toString.call(o).slice(8, -1);
}

function allowClone(name, cloneInfo) {
    var rt = true;
    if (cloneInfo) {
        if (cloneInfo.hasOwnProperty("noCloneFields")) {
            rt = cloneInfo.noCloneFields.indexOf(name) >= 0
        }
    }
    return rt;
}

function clone(object, previous) {
    var rt = null;
    if (typeof object === "string" || object === null || object === undefined) {
        return object;
    } else if (object instanceof Array) {
        rt = [];

        for (var i = 0; i < object.length; i++) {
            rt[i] = clone(object[i], previous);
        }
    } else if (typeof object === "object") {
        if (!previous) {
            previous = [];
        }
        for (var x = 0; x < previous.length; x++) {
            if (object === previous[x][0]) {
                return previous[x][1];
            }
        }
        rt = Object.create(Object.getPrototypeOf(object));
        previous.push([this, rt]);

        var cloneInfo = null;
        if (typeof object['cloneInfo'] === "function") {
            cloneInfo = object.cloneInfo();
        } else {
            cloneInfo = object.cloneInfo;
        }

        for (var i in object) {
            if (object.hasOwnProperty(i)) {
                if (allowClone(i, cloneInfo)) {
                    rt[i] = clone(object[i], previous);
                } else {
                    rt[i] = object[i];
                }
            }
        }
    }

    return rt;
}

function DField(name) {
    this.name = name;
}

DField.prototype.html = null;
DField.prototype.label = null;
DField.prototype.cloneInfo = {};

DField.prototype.toJSON = function () {
    return "Some Value";
};

DField.prototype.getName = function () {
    return this.name;
};

DField.prototype.render = function () {
    return this.html;
};

DField.prototype.renderLabel = function (id) {
    return jQuery("<label/>", {text: this.label, for: id}).addClass("col-sm-2 control-label");
};

DField.prototype.setLabel = function (label) {
    this.label = label;
};

DField.prototype.setVisibleCondition = function (name) {
    this.visibleConditionName = name;
};

DField.prototype.resolveConditions = function (conditions) {
    if (this.visibleConditionName) {
        if (!conditions[this.visibleConditionName]) {
            throw new ReferenceError("Unknown condition " + this.visibleConditionName);
        }
        conditions[this.visibleConditionName].watch(this.visibilityChanged.bind(this));
        console.log("Resolved visibility condition");
    }
};

DField.prototype.visibilityChanged = function (value) {
    console.log("Visibility changed ", value);
    this.setVisible(value);
};

DField.prototype.setHelp = function (help) {
    this.help = help;
};

DField.prototype.destroy = function() {
    this.html.detach();
};

DField.prototype.setVisible = function (value) {
    if (value) {
        this.html.show();
    } else {
        this.html.hide();
    }
};

DField.prototype.renderInput = function () {
    throw new ErrorException("Override renderInput");
};

DField.prototype.getInputID = function () {
    return undefined;
};

DField.prototype.render = function () {
    if (!this.html) {
        var input = this.renderInput();
        var label = this.renderLabel(this.getInputID());
        var help;
        if (this.help) {
            help = jQuery("<span/>", {text: this.help}).addClass("help-block")
        }

        this.html = jQuery("<div/>").addClass("form-group")
            .append(label)
            .append(jQuery("<div/>").addClass("col-sm-10")
                .append(input).append(help));
    }
    return this.html;
};

function DRepeating(name, parent) {
    DField.prototype.constructor.call(this, name);
    this.template = new DForm(name, parent);
    this.parent = parent;
    this.delButton = null;
}

DRepeating.prototype = Object.create(DField.prototype);
DRepeating.prototype.constructor = DRepeating;
DRepeating.prototype.template = null;
DRepeating.prototype.rows = [];

DRepeating.prototype.getTemplate = function () {
    return this.template;
};

DRepeating.prototype.renderInput = function () {
    this.addButton = jQuery("<button/>").addClass("btn btn-default btn-sm glyphicon glyphicon-plus").click(this.addRow.bind(this));
    this.body = jQuery("<div/>");
    this.delButton = jQuery("<button/>").addClass("btn btn-default btn-sm glyphicon glyphicon-minus").click(this.delRow.bind(this)).hide();
    return jQuery("<div/>").append(this.body).append(this.addButton).append(this.delButton);
};

DRepeating.prototype.addRow = function (event) {
    var newRow = clone(this.template, [[this.parent, this.parent]]);
    this.rows.push(newRow);
    this.body.append(newRow.render());
    if (event) {
        event.preventDefault();
    }
    this.delButton.show();
};

DRepeating.prototype.delRow = function () {
    this.rows.pop().destroy();
    if (this.rows.length === 0) {
        this.delButton.hide();
    }
};

DRepeating.prototype.toJSON = function () {
    var rt = [];

    for (var i = 0; i < this.rows.length; i++) {
        rt[i] = this.rows[i].toJSON();
    }

    return rt;
};

DRepeating.prototype.setValue = function (value) {
    while (this.rows.length < value.length) {
        this.addRow();
    }
    while (this.rows.length > value.length) {
        this.delRow();
    }
    for (var i = 0; i < value.length; i++) {
        this.rows[i].setValue(value[i]);
    }
};

function DForm(name, parent) {
    DField.prototype.constructor.call(this, name);
    this.parent = parent;
    this.fields = {};
}

DForm.prototype = Object.create(DField.prototype);
DForm.prototype.constructor = DForm;
DForm.prototype.fields = {};
DForm.prototype.parent = null;

DForm.prototype.addField = function (name, type) {
    this.fields[name] = new DInput(name, type);
    return this.fields[name];
};

DForm.prototype.getField = function (name) {
    if (!this.fields[name]) {
        throw new Error("No field named " + name + " in form " + this.name);
    }
    return this.fields[name];
};

DForm.prototype.beginNewSubFormRepeating = function (name) {
    console.log("Beginning new subform " + name + " inside " + this.name);
    this.fields[name] = new DRepeating(name, this);
    return this.fields[name];
};

DForm.prototype.endSubForm = function () {
    console.log("Ending subform " + this.name + " and returning to " + this.parent.name);
    return this.parent;
};

DForm.prototype.toJSON = function () {
    var rt = {};

    for (var i in this.fields) {
        if (this.fields.hasOwnProperty(i)) {
            rt[i] = this.fields[i].toJSON();
        }
    }

    return rt;
};

DForm.prototype.setValue = function (json) {
    console.log(json);
    for (var i in this.fields) {
        if (this.fields.hasOwnProperty(i) && json.hasOwnProperty(i)) {
            this.fields[i].setValue(json[i]);
        }
    }
};

DForm.prototype.resolveConditions = function (conditions) {
    for (var i in this.fields) {
        if (this.fields.hasOwnProperty(i)) {
            this.fields[i].resolveConditions(conditions);
        }
    }
};

DForm.prototype.render = function () {
    if (!this.html) {
        this.html = jQuery("<div/>");
        for (var i in this.fields) {
            if (this.fields.hasOwnProperty(i)) {
                this.html.append(this.fields[i].render());
            }
        }
    }
    return this.html;
};

function DInput(name, type) {
    DField.prototype.constructor.call(this, name);
    this.type = type;
    this.options = [];
    this.conditions = [];
}

DInput.prototype = Object.create(DField.prototype);
DInput.prototype.constructor = DInput;
DInput.prototype.input = null;
DInput.prototype.type = null;
DInput.prototype.options = null;
DInput.prototype.conditions = null;
DInput.prototype.cloneInfo = {noCloneFields: ["conditions"]};

DInput.prototype.renderInput = function () {
    if (this.type === "enum") {
        this.input = jQuery("<select/>");
        this.input.append(jQuery("<option/>", {value: "", text: "Please Select One"}));
        for (var i = 0; i < this.options.length; i++) {
            this.input.append(jQuery("<option/>", {text: this.options[i]}));
        }
    } else {
        this.input = jQuery("<input/>", {type: this.type});
    }
    this.input.addClass("form-control").uniqueId().change(this.changed.bind(this));
    if(this.placeholder) {
        this.input.attr("placeholder",this.placeholder);
    }
    return this.input;
};

DInput.prototype.getInputID = function () {
    return this.input.attr("id");
};

DInput.prototype.setPlaceholder = function(value) {
    this.placeholder = value;
};

DInput.prototype.changed = function () {
    for (var i = 0; i < this.conditions.length; i++) {
        this.conditions[i].calculate();
    }
};

DInput.prototype.toJSON = function () {
    return this.input.val();
};

DInput.prototype.addOption = function (label) {
    this.options.push(label);
};

DInput.prototype.trigger = function (condition) {
    this.conditions.push(condition);
};

DInput.prototype.getValue = function () {
    return this.input ? this.input.val() : null;
};

DInput.prototype.setValue = function (value) {
    this.input.val(value);
    this.changed();
};

function BaseCondition() {

}

BaseCondition.prototype.constructor = BaseCondition;
BaseCondition.prototype.toString = function () {
    throw new Error("Override toString for " + classof(this));
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
BaseCondition.prototype.resolveFields = function (condition, form) {
    throw new Error("Override resolveFields for " + classof(this));
};

BaseCondition.prototype.resolveConditions = function () {
    // todo
};

function Condition(name, condition) {
    BaseCondition.prototype.constructor.call(this);
    this.name = name;
    this.condition = condition;
    this.callbacks = [];
}

Condition.prototype = Object.create(BaseCondition.prototype);
Condition.prototype.constructor = Condition;

Condition.prototype.getName = function () {
    return this.name;
};

Condition.prototype.watch = function (callback) {
    this.callbacks.push(callback);
};

/**
 * @param {DForm} form
 */
Condition.prototype.resolveFields = function (form) {
    this.form = form;
    this.condition.resolveFields(this, form);
};

Condition.prototype.toString = function () {
    return this.condition.toString();
};

Condition.prototype.calculate = function () {
    console.log("Evaluating", this.name);
    var value = this.condition.evaluate(this.form);

    for (var i = 0; i < this.callbacks.length; i++) {
        this.callbacks[i](value);
    }
};

function ConditionIf(condition, then) {
    this.condition = condition;
    this.then = then;
}

ConditionIf.prototype = Object.create(BaseCondition.prototype);
ConditionIf.prototype.constructor = ConditionIf;

ConditionIf.prototype.toString = function () {
    return "if(" + this.condition.toString() + ") {\n" + this.then.toString() + "\n}";
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionIf.prototype.resolveFields = function (condition, form) {
    this.condition.resolveFields(condition, form);
    this.then.resolveFields(condition, form);
};

function ConditionAnd() {
    this.conditions = [];
}

ConditionAnd.prototype = Object.create(BaseCondition.prototype);
ConditionAnd.prototype.constructor = ConditionAnd;

ConditionAnd.prototype.add = function (condition) {
    this.conditions.push(condition);
    return this;
};

ConditionAnd.prototype.toString = function () {
    var rt = [];
    for (var i = 0; i < this.conditions.length; i++) {
        rt[i] = this.conditions[i].toString();
    }
    return "(" + rt.join(") and (") + ")";
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionAnd.prototype.resolveFields = function (condition, form) {
    for (var i = 0; i < this.conditions.length; i++) {
        this.conditions[i].resolveFields(condition, form);
    }
};

ConditionAnd.prototype.evaluate = function (form) {
    var rt = true;

    for (var i = 0; i < this.conditions.length; i++) {
        if (!this.conditions[i].evaluate(form)) {
            rt = false;
            break;
        }
    }


    return rt;
};

function ConditionOr() {
    this.conditions = [];
}

ConditionOr.prototype = Object.create(BaseCondition.prototype);
ConditionOr.prototype.constructor = ConditionOr;

ConditionOr.prototype.add = function (condition) {
    this.conditions.push(condition);
    return this;
};

ConditionOr.prototype.toString = function () {
    var rt = [];
    for (var i = 0; i < this.conditions.length; i++) {
        rt[i] = this.conditions[i].toString();
    }
    return "(" + rt.join(") or (") + ")";
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionOr.prototype.resolveFields = function (condition, form) {
    for (var i = 0; i < this.conditions.length; i++) {
        this.conditions[i].resolveFields(condition, form);
    }
};

ConditionOr.prototype.evaluate = function (form) {
    var rt = false;

    for (var i = 0; i < this.conditions.length; i++) {
        if (this.conditions[i].evaluate(form)) {
            rt = true;
            break;
        }
    }


    return rt;
};

function ConditionNot(condition) {
    this.condition = condition;
}

ConditionNot.prototype = Object.create(BaseCondition.prototype);
ConditionNot.prototype.constructor = ConditionNot;

ConditionNot.prototype.toString = function () {
    return "not " + this.condition.toString();
};

ConditionNot.prototype.evaluate = function (form) {
    return !this.condition.evaluate(form);
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionNot.prototype.resolveFields = function (condition, form) {
    this.condition.resolveFields(condition, form);
};

function ConditionEquals(left, right) {
    this.left = left;
    this.right = right;
}

ConditionEquals.prototype = Object.create(BaseCondition.prototype);
ConditionEquals.prototype.constructor = ConditionEquals;

ConditionEquals.prototype.toString = function () {
    return this.left.toString() + " = " + (this.right ? this.right.toString() : "null");
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionEquals.prototype.resolveFields = function (condition, form) {
    if (this.left instanceof BaseCondition) {
        this.left.resolveFields(condition, form);
    }
    if (this.right instanceof BaseCondition) {
        this.right.resolveFields(condition, form);
    }
};

ConditionEquals.prototype.evaluate = function (form) {
    var left = this.left instanceof BaseCondition ? this.left.evaluate(form) : this.left;
    var right = this.right instanceof BaseCondition ? this.right.evaluate(form) : this.right;

    return left == right;
};



function ConditionFieldValue(name) {
    this.name = name;
}

ConditionFieldValue.prototype = Object.create(BaseCondition.prototype);
ConditionFieldValue.prototype.constructor = ConditionFieldValue;

ConditionFieldValue.prototype.toString = function () {
    return this.name;
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionFieldValue.prototype.resolveFields = function (condition, form) {
    var field = form.getField(this.name);
    if (field instanceof DInput) {
        field.trigger(condition);
    } else {
        throw new TypeError("field " + this.name + " is not of type DInput");
    }
};

ConditionFieldValue.prototype.evaluate = function (form) {
    var field = form.getField(this.name);
    return field.getValue();
};

function ConditionEmpty(condition) {
    this.condition = condition;
}

ConditionEmpty.prototype = Object.create(BaseCondition.prototype);
ConditionEmpty.prototype.constructor = ConditionEmpty;

ConditionEmpty.prototype.toString = function () {
    return "empty(" + this.condition.toString() + ")";
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionEmpty.prototype.resolveFields = function (condition, form) {
    this.condition.resolveFields(condition, form);
};

ConditionEmpty.prototype.evaluate = function (form) {
    var value = this.condition.evaluate(form);
    return value === null || value === "" || value === undefined;
};

function ConditionThen(condition) {
    this.condition = condition;
}

ConditionThen.prototype = Object.create(BaseCondition.prototype);
ConditionThen.prototype.constructor = ConditionThen;

ConditionThen.prototype.toString = function () {
    // return "Then(" + this.condition.toString() + ")";
};

/**
 * @param {Condition} condition
 * @param {DForm} form
 */
ConditionThen.prototype.resolveFields = function (condition, form) {

};

function ConditionWatcher(conditions) {
    this.conditions = conditions;
}

ConditionWatcher.prototype.render = function () {
    var html = jQuery("<table/>").addClass("table table-condensed")
        .append(jQuery("<thead/>")
            .append(jQuery("<tr/>")
                .append(jQuery("<th/>", {text: "Name"}))
                .append(jQuery("<th/>", {text: "Expression"}))
                .append(jQuery("<th/>", {text: "Value"}))
            ));

    var body = jQuery("<tbody/>");

    for (var i in this.conditions) {
        if (this.conditions.hasOwnProperty(i)) {
            body.append(jQuery("<tr/>")
                .append(jQuery("<td/>", {text: this.conditions[i].getName()}))
                .append(jQuery("<td/>", {text: this.conditions[i].toString()}))
                .append(this.renderValue(this.conditions[i])));
        }
    }

    html.append(body);

    return html;
};

ConditionWatcher.prototype.renderValue = function (condition) {
    var currentValue = jQuery("<td/>");
    condition.watch(function (value) {
        if (typeof value === "boolean") {
            value = value ? "true" : "false";
        }
        currentValue.text(value);
    });
    return currentValue;
};

function endOfConditions() {
    var i;
    for (i in conditions) {
        if (conditions.hasOwnProperty(i)) {
            conditions[i].resolveConditions(conditions[i], conditions);
        }
    }
    form.resolveConditions(conditions);
    jQuery("body").append((new ConditionWatcher(conditions)).render());
    for (i in conditions) {
        if (conditions.hasOwnProperty(i)) {
            conditions[i].calculate();
        }
    }
}
