import jQuery = require('jquery');
import jsonschema = require('jsonschema');
import {Expressions} from "./expressions";

export module Form {
    import DExpressions = Expressions.DExpressions;
    import DFieldContainerInterface = Expressions.DFieldContainerInterface;
    import DFieldInterface = Expressions.DFieldInterface;
    import ExpressionCallback = Expressions.ExpressionCallback;
    import DExpression = Expressions.DExpression;
    export interface DFieldContainer extends DFieldContainerInterface {
        getField(name: string, uprecurse: boolean): DBase;
        isVisible(): boolean;
        getExpression(name: string): DExpression;
        getPath(): string;
    }
    export abstract class DBase {
        constructor(name: string, parent: DFieldContainer) {
            this.name = name;
            this.parent = parent;
        }

        private name: string;
        private label: string;
        protected parent: DFieldContainer;

        public getPath(): string {
            return this.parent.getPath() + this.getName();
        }

        public getName(): string {
            return this.name;
        }

        public setLabel(value) {
            this.label = value;
        }

        public getLabel(): string {
            return this.label;
        }

        public renderLabel() {
            return jQuery("<label/>", {text: this.label});
        }

        public hasLabel(): boolean {
            return this.label != null;
        }

        public abstract loadLayout(data: any, factory: DFactory);

        public abstract render(): JQuery;

        public abstract renderJSON(data);

        public abstract populateFromJSON(data);

        public abstract destroy();

        public abstract attachHtml(html: JQuery);
    }

    export class DForm implements DFieldContainer {
        private sections: { [name: string]: DSection } = {};
        private html: JQuery;
        private saveCallback: (data) => void;
        private expressions: DExpressions = new DExpressions();

        public loadLayout(data: any, factory: DFactory) {
            if (data.expressions instanceof Object) {
                this.expressions.loadSchema(data.expressions, this);
            }
            for (let i in data.sections) {
                let section = factory.section(i, this, data.sections[i]);
                this.sections[i] = section;
                section.loadLayout(data.sections[i], factory);
            }
            this.expressions.resolveFields();
        }

        public render(): JQuery {
            if (!this.html) {
                this.html = jQuery("<div/>");
                let tabs = jQuery("<ul/>", {role: "tablist"}).addClass("nav nav-tabs");
                let body = jQuery("<div/>").addClass("tab-content");
                let first = true;
                for (let i in this.sections) {
                    tabs.append(jQuery("<li/>", {role: "presentation"}).append(jQuery("<a/>", {
                        href: "#" + this.sections[i].getName(),
                        role: "tab",
                        "data-toggle": "tab",
                        text: this.sections[i].getLabel() ? this.sections[i].getLabel() : this.sections[i].getName()
                    })));
                    let tabcontent = jQuery("<div/>", {
                        role: "tabpanel",
                        id: this.sections[i].getName()
                    }).addClass("tab-pane").append(this.sections[i].render());
                    if (first) {
                        tabcontent.addClass("active");
                    }
                    body.append(tabcontent);
                    first = false;
                }
                this.html.append(tabs).append(body);
                this.expressions.evaluateAll();
            }
            return this.html;
        }

        public renderDebug(): JQuery {
            return this.expressions.renderDebug();
        }

        public renderJSON(data) {
            for (let i in this.sections) {
                data = this.sections[i].renderJSON(data);
            }
            return data;
        }

        public populateFromJSON(data) {
            for (let i in this.sections) {
                this.sections[i].populateFromJSON(data);
            }
        }

        public setSaveCallback(callback: (data) => void) {
            this.saveCallback = callback;
        }

        public save() {
            if (!this.saveCallback) {
                throw new Error("No callback set!");
            }
            this.saveCallback(this.renderJSON({}));
        }

        public getField(name: string, uprecurse: boolean = false): DBase {
            let rt = null;
            for (let i in this.sections) {
                rt = this.sections[i].getField(name, false);
                if (rt) {
                    break;
                }
            }
            return rt;
        }

        getFieldByName(name: string): Expressions.DFieldInterface {
            let f = this.getField(name);
            return (f instanceof DInput) ? f : null;
        }

        public destroy() {
            this.html.detach();
            this.expressions.destroy();
        }

        isVisible(): boolean {
            return true;
        }

        getExpression(name: string): Expressions.DExpression {
            return this.expressions.getExpression(name);
        }

        getPath(): string {
            return "/";
        }
    }

    export interface DRowRenderer {
        renderField(field: DBase, parent: DContainer): JQuery;
        renderFormStart(forObject: DContainer): JQuery;
    }

    export class DRowRendererDefault implements DRowRenderer {
        public renderField(field: DBase, parent: DContainer): JQuery {
            let fieldRender = field.render();
            if (parent.inline()) {
                let rt = jQuery("<span/>");
                if (field.hasLabel()) {
                    let label = field.renderLabel();
                    label.addClass("control-label");
                    rt.append(label);
                }
                rt.append(fieldRender);
                field.attachHtml(rt.children());
                return rt.children();
            } else {
                let label;
                if (field.hasLabel()) {
                    label = field.renderLabel();
                    label.addClass("control-label");
                    label.addClass("col-sm-2");
                }
                let rt = jQuery("<div/>").addClass("form-group").append(label)
                    .append(jQuery("<span/>").addClass(label ? "col-sm-10" : null).append(fieldRender));
                field.attachHtml(rt);
                return rt;
            }
        }

        public renderFormStart(forObject: DContainer): JQuery {
            return jQuery("<div/>").addClass(forObject.inline() ? "form-inline" : "form-horizontal");
        }
    }

    export abstract class DContainer extends DBase implements DFieldContainer {
        protected fields: { [name: string]: DBase } = {};
        protected rowRenderer: DRowRenderer;
        protected html: JQuery;

        public inline(): boolean {
            return false;
        }

        public loadLayout(data: any, factory: DFactory) {
            this.rowRenderer = factory.rowRenderer(this);
            if (data.label) {
                this.setLabel(data.label);
            }
            for (let i in data.fields) {
                if (this.checkForExistingField(i)) {
                    throw new Error("Field " + i + " already exists");
                } else {
                    this.fields[i] = factory.field(i, this, data.fields[i]);
                    this.fields[i].loadLayout(data.fields[i], factory);
                }
            }
        }

        protected checkForExistingField(name: string): boolean {
            if (this.getField(name, true) != null) {
                throw new Error("Field " + name + " already exists");
            }
            return false;
        }

        public renderJSON(data) {
            for (let i in this.fields) {
                data = this.fields[i].renderJSON(data);
            }
            return data;
        }

        public populateFromJSON(data) {
            for (let i in this.fields) {
                this.fields[i].populateFromJSON(data);
            }
        }

        public render(): JQuery {
            if (!this.html) {
                this.html = this.rowRenderer.renderFormStart(this);
                for (let i in this.fields) {
                    this.html.append(this.rowRenderer.renderField(this.fields[i], this));
                }
            }
            return this.html;
        }

        public getField(name: string, uprecurse: boolean = true): DBase {
            if (uprecurse) {
                return this.parent.getField(name, true);
            } else if (this.fields.hasOwnProperty(name)) {
                return this.fields[name];
            } else {
                return null;
            }
        }

        getFieldByName(name: string): Expressions.DFieldInterface {
            let f = this.getField(name);
            return f instanceof DInput ? f : null;
        }

        public destroy() {
            this.html.detach();
        }

        public attachHtml(html: JQuery) {
        }

        isVisible(): boolean {
            return this.parent.isVisible();
        }

        getExpression(name: string): Expressions.DExpression {
            return this.parent.getExpression(name);
        }

        public getPath(): string {
            return super.getPath() + "/";
        }
    }

    export class DSection extends DContainer {
    }

    export abstract class DInput extends DBase implements DFieldInterface, ExpressionCallback {
        protected input: JQuery;
        protected html: JQuery;
        protected placeHolder;
        protected size: number;
        protected watchers: Array<Expressions.FieldCallback> = [];
        protected attachedHTML: Array<JQuery> = [];
        private visible: boolean = true;
        private visibleExpression: string;
        private validExpression: string;
        private valid: boolean = true;

        public isVisible(): boolean {
            return this.visible && this.parent.isVisible();
        }

        public setVisible(value: boolean) {
            if (this.visible != value) {
                if (value) {
                    if (this.attachedHTML.length) {
                        this.attachedHTML.forEach(function (html) {
                            html.show();
                        });
                    } else if (this.html) {
                        this.html.show();
                    }
                } else {
                    if (this.attachedHTML.length) {
                        this.attachedHTML.forEach(function (html) {
                            html.hide();
                        });
                    } else if (this.html) {
                        this.html.hide();
                    }
                }
            }
            this.visible = value;
        }

        public setValid(valid: boolean) {
            if (valid) {
                if (this.attachedHTML.length) {
                    this.attachedHTML.forEach(function (html) {
                        html.addClass("has-success").removeClass("has-error");
                    });
                } else if (this.html) {
                    this.html.addClass("has-success").removeClass("has-error");
                }
            } else {
                if (this.attachedHTML.length) {
                    this.attachedHTML.forEach(function (html) {
                        html.removeClass("has-success").addClass("has-error");
                    });
                } else if (this.html) {
                    this.html.removeClass("has-success").addClass("has-error");
                }
            }
            this.valid = valid;
        }

        public render(): JQuery {
            if (!this.html) {
                this.html = jQuery("<span/>");
                if (this.size) {
                    this.html.addClass("col-sm-" + this.size);
                }
                this.html.append(this.renderInput());
                if (this.input && this.size) {
                    this.input.addClass("col-sm-12");
                }
            }
            return this.html;
        }

        public loadLayout(data: any, factory: DFactory) {
            if (data.label) {
                this.setLabel(data.label);
            }
            if (data.placeholder) {
                this.placeHolder = data.placeholder;
            }
            if (data.size) {
                this.size = data.size;
            }
            if (data.visible) {
                this.visibleExpression = data.visible;
                this.parent.getExpression(this.visibleExpression).listen(this);
            }
            if (data.valid) {
                this.validExpression = data.valid;
                this.parent.getExpression(this.validExpression).listen(this);
            }
        }

        public setValue(value: any) {
            if (this.input) {
                this.input.val(value);
            }
        }

        public getValue(): any {
            if (this.input) {
                let rt = this.input.val();
                if (!rt || rt.trim() == "") {
                    rt = null;
                }
                return rt;
            } else {
                return null;
            }
        }

        public renderInput(): JQuery {
            this.input = jQuery("<input/>").addClass("form-control").attr("name", this.getName()).change(this.valueChangedCallback.bind(this));
            if (this.placeHolder) {
                this.input.attr("placeholder", this.placeHolder);
            }
            return this.input;
        }

        protected valueChangedCallback() {
            this.watchers.forEach(function (watcher) {
                watcher.fieldCallback(this);
            }, this);
        }

        public renderJSON(data) {
            if (this.isVisible()) {
                data[this.getName()] = this.getValue();
            }
            return data;
        }

        public populateFromJSON(data) {
            if (data.hasOwnProperty(this.getName())) {
                this.setValue(data[this.getName()]);
            } else {
                this.setValue(null);
            }
        }

        public destroy() {
            this.html.detach();
        }

        renderLabel(): JQuery {
            return super.renderLabel().attr("for", this.input ? this.input.uniqueId().attr("id") : null);
        }

        public attachHtml(html: JQuery) {
            this.attachedHTML.push(html);
        }

        watch(callback: Expressions.FieldCallback) {
            if (this.watchers.indexOf(callback) < 0) {
                this.watchers.push(callback);
            }
        }

        expressionCallback(newValue: any, oldValue: any, expression: Expressions.DExpression) {
            if (expression.getName() == this.visibleExpression) {
                this.setVisible(newValue);
            }
            if (expression.getName() == this.validExpression) {
                this.setValid(newValue);
            }
        }
    }

    export class DTextInput extends DInput {
        protected suggestions;

        public loadLayout(data: any, factory: DFactory) {
            super.loadLayout(data, factory);
            if (data.suggestions) {
                this.suggestions = data.suggestions;
            }
        }

        public render(): JQuery {
            super.render();
            if (this.suggestions) {
                let button = jQuery("<button/>", {type: "button", "data-toggle": "dropdown", "aria-haspopup": true, "aria-expanded": true})
                    .addClass("btn btn-default dropdown-toggle")
                    .append(jQuery("<span/>").addClass("caret")).uniqueId();
                let dropdown = jQuery("<span/>").addClass("dropdown").append(button);
                let options = jQuery("<ul/>", {"aria-labelledby": button.attr("id")}).addClass("dropdown-menu dropdown-menu-right");
                for (let i in this.suggestions) {
                    if (this.suggestions.hasOwnProperty(i)) {
                        options.append(jQuery("<li/>").append(jQuery("<a/>", {"href": "#", text: this.suggestions[i]})));
                    }
                }
                dropdown.append(options);
                this.input.parent().wrapInner(jQuery("<table/>").addClass("col-sm-12").append(jQuery("<tr/>").append(jQuery("<td/>"))));
                this.input.parentsUntil("tr").parent().append(jQuery("<td/>").append(dropdown).css("width", "34px"));
            }
            return this.html;
        }
    }

    export class DCurrencyInput extends DInput {
        public renderInput(): JQuery {
            let rt = jQuery("<div/>").addClass("input-group").append(jQuery("<div/>", {text: "$"}).addClass("input-group-addon"));
            return rt.append(super.renderInput());
        }
    }

    export class DEnumInput extends DInput {
        private options;
        private defaultValue;

        public renderInput(): JQuery {
            this.input = jQuery("<select/>").addClass("form-control");
            if (!this.defaultValue) {
                this.input.append(jQuery("<option/>", {text: "Please Select One", value: ""}));
            }
            for (let i in this.options) {
                if (this.options.hasOwnProperty(i)) {
                    let value = i;
                    if (this.options instanceof Array) {
                        value = this.options[i];
                    }
                    this.input.append(jQuery("<option/>", {text: this.options[i], value: value}));
                }
            }
            this.input.change(this.valueChangedCallback.bind(this));
            return this.input;
        }

        public loadLayout(data: any, factory: DFactory) {
            super.loadLayout(data, factory);
            if (data.options) {
                this.options = data.options;
            }
            if (data.default) {
                this.defaultValue = data.default;
            }
        }
    }

    export class DMultiple extends DContainer {
        public inline(): boolean {
            return true;
        }
    }

    export class DStatic extends DInput {
        public render(): JQuery {
            this.html = jQuery("<div/>").addClass("form-control-static");
            return this.html;
        }

        public setValue(value: any): any {
            this.html.text(value);
        }

        public getValue(): any {
            return null;
        }


        public renderJSON(data): any {
            return data;
        }
    }

    export class DDecimalInput extends DInput {

    }

    export class DNumberInput extends DInput {

    }

    export class DRepeatingSection extends DContainer {
        private rows: DRepeatingSectionRow[] = [];
        private body: JQuery;
        private addButton: JQuery;
        private delButton: JQuery;
        private minRows: number;
        private maxRows: number;
        private factory: DFactory;
        private schemaData;
        private isInline: boolean = false;

        public getField(name: string, uprecurse: boolean = true): DBase {
            return null;
        }

        protected checkForExistingField(name: string): boolean {
            return false;
        }

        public render(): JQuery {
            if (!this.html) {
                this.html = this.rowRenderer.renderFormStart(this);
                this.body = jQuery("<div/>");
                this.html.append(this.body);
                for (let i in this.rows) {
                    this.body.append(this.rowRenderer.renderField(this.rows[i], this));
                }
                this.addButton = jQuery("<button/>", {"class": "btn btn-default glyphicon glyphicon-plus"}).click(this.addRow.bind(this));
                this.delButton = jQuery("<button/>", {"class": "btn btn-default glyphicon glyphicon-minus"}).click(this.delRow.bind(this));
                this.html.append(this.addButton).append(this.delButton);
                this.checkButtons();
            }
            return this.html;
        }

        public loadLayout(data: any, factory: DFactory): any {
            if (data.minRows) {
                this.minRows = data.minRows;
            }
            if (data.maxRows) {
                this.maxRows = data.maxRows;
            }
            if (data.hasOwnProperty('inline')) {
                this.isInline = data.inline;
            }
            this.factory = factory;
            this.schemaData = data;
            while (this.rows.length < this.minRows) {
                this.addRow();
            }
            return super.loadLayout(data, factory);
        }

        public addRow() {
            let row = this.factory.repeating(this.rows.length.toString(), this);
            row.loadLayout({fields: this.schemaData.fields}, this.factory);
            this.rows.push(row);
            if (this.body) {
                this.body.append(this.rowRenderer.renderField(row, this));
            }
            this.checkButtons();
        }

        public delRow() {
            if (this.rows.length > 0) {
                this.rows.pop().destroy();
            }
            this.checkButtons();
        }

        private checkButtons() {
            if (this.addButton) {
                if (this.maxRows !== null && this.rows.length >= this.maxRows) {
                    this.addButton.hide();
                } else {
                    this.addButton.show();
                }
                if (this.minRows !== null && this.rows.length <= this.minRows) {
                    this.delButton.hide();
                } else {
                    this.delButton.show();
                }
            }
        }

        public renderJSON(data): any {
            let rt = [];

            for (let i = 0; i < this.rows.length; i++) {
                rt.push(this.rows[i].renderJSON({}));
            }

            data[this.getName()] = rt;

            return data;
        }

        public inline(): boolean {
            return this.isInline;
        }

        public populateFromJSON(data): any {
            if (data.hasOwnProperty(this.getName())) {
                let rows: Array<any> = data[this.getName()];
                while (this.rows.length < rows.length) {
                    this.addRow();
                }
                while (this.rows.length > rows.length) {
                    this.delRow();
                }
                for (let i = 0; i < this.rows.length; i++) {
                    this.rows[i].populateFromJSON(rows[i]);
                }
            }
        }
    }

    export class DRepeatingSectionRow extends DContainer {
        constructor(name: string, parent: DFieldContainer) {
            super(name, parent);
        }

        public inline(): boolean {
            return true;
        }
    }

    export interface DFactory {
        form(name: string, schema): DForm;
        field(name: string, parent: DFieldContainer, schema): DBase;
        section(name: string, parent: DFieldContainer, schema): DSection;
        rowRenderer(forObject: DBase): DRowRenderer;
        repeating(name: string, parent: DFieldContainer): DRepeatingSectionRow;
    }

    export class DDefaultFactory implements DFactory {
        public form(name: string, schema): DForm {
            return new DForm();
        }

        public field(name: string, parent: DFieldContainer, schema): DBase {
            let input: DBase = null;
            switch (schema.type) {
                case "currency":
                    input = new DCurrencyInput(name, parent);
                    break;
                case "enum":
                    input = new DEnumInput(name, parent);
                    break;
                case "multiple":
                    input = new DMultiple(name, parent);
                    break;
                case "text":
                    input = new DTextInput(name, parent);
                    break;
                case "static":
                    input = new DStatic(name, parent);
                    break;
                case "decimal":
                    input = new DDecimalInput(name, parent);
                    break;
                case "number":
                    input = new DNumberInput(name, parent);
                    break;
                case "repeating":
                    input = new DRepeatingSection(name, parent);
                    break;
                default:
                    throw new TypeError("Unknown field type " + schema.type);
            }
            return input;
        }

        public section(name: string, parent: DFieldContainer, schema): DSection {
            return new DSection(name, parent);
        }

        public rowRenderer(forObject: DBase): DRowRenderer {
            return new DRowRendererDefault();
        }

        public repeating(name: string, parent: DFieldContainer): DRepeatingSectionRow {
            return new DRepeatingSectionRow(name, parent);
        }
    }

    let validator = new jsonschema.Validator();
    let schema = require("../schema.json");
    validator.addSchema(schema, "http://org/v1#");

    export function loadForm(layout, callback: (DForm) => void, factory: DFactory = null) {
        if (!factory) {
            factory = new DDefaultFactory();
        }
        try {
            let valid = validator.validate(layout, schema);
            if (valid.valid) {
                let f = factory.form(name, layout);
                f.loadLayout(layout, factory);
                callback(f);
            } else {
                alert(valid.toString());
            }
        } catch (e) {
            alert(e.toString());
        }
    }

    export function loadFormFromURL(url: string, callback: (DForm) => void, factory: DFactory = null) {
        jQuery.ajax(url, {
            dataType: "json",
            crossDomain: true,
            success: function (data, textStatus, jqXHR) {
                loadForm(data, callback, factory);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus, errorThrown);
            }
        });
    }
}
