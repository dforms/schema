import jQuery = require('jquery');

export module Expressions {
    export interface ExpressionCallback {
        expressionCallback(newValue: any, oldValue: any, expression: DExpression);
    }
    export interface FieldCallback {
        fieldCallback(field: DFieldInterface);
    }
    export interface DFieldInterface {
        getValue(): any;
        watch(callback: FieldCallback);
    }

    export interface DFieldContainerInterface {
        getFieldByName(name: string): DFieldInterface;
    }

    export class DExpressions implements ExpressionCallback {
        private expressions: { [p: string]: DExpression } = {};
        private debugTable: JQuery;

        public loadSchema(data, context: DFieldContainerInterface) {
            for (let i in data) {
                if (data.hasOwnProperty(i)) {
                    this.expressions[i] = new DExpression(i, data[i], this, context);
                }
            }
        }

        public resolveFields() {
            for (let i in this.expressions) {
                this.expressions[i].resolveFields();
            }
        }

        public buildCondition(data: any): DConditionBase {
            if (data.hasOwnProperty("and") && data.and instanceof Array) {
                return new DConditionAnd(data.and, this);
            } else if (data.hasOwnProperty("or") && data.or instanceof Array) {
                return new DConditionOr(data.or, this);
            } else if (data.hasOwnProperty("greaterthan") && data.greaterthan instanceof Array) {
                return new DConditionGreaterThan(data.greaterthan, this);
            } else if (data.hasOwnProperty("lessthan") && data.lessthan instanceof Array) {
                return new DConditionLessThan(data.lessthan, this);
            } else if (data.hasOwnProperty("not") && data.not instanceof Object) {
                return new DConditionNot(data.not, this);
            } else if (data.hasOwnProperty("empty") && data.empty instanceof Object) {
                return new DConditionEmpty(data.empty, this);
            } else if (data.hasOwnProperty("equals") && data.equals instanceof Object) {
                return new DConditionEquals(data.equals, this);
            } else if (data.hasOwnProperty("field")) {
                return new DConditionField(data.field, this);
            } else if (data.hasOwnProperty("value")) {
                return new DConditionValue(data.value, this);
            } else {
                throw new TypeError("Unknown condition " + JSON.stringify(data));
            }
        }

        expressionCallback(newValue: any, oldValue: any, expression: DExpression) {
            this.debugTable.find("[condition='" + expression.getName() + "']").text(newValue);
        }

        public renderDebug(): JQuery {
            let tbody = jQuery("<tbody/>");
            this.debugTable = jQuery("<table/>").addClass("table")
                .append(jQuery("<thead/>")
                    .append(jQuery("<tr/>")
                        .append(jQuery("<th/>", {text: "Name"}))
                        .append(jQuery("<th/>", {text: "Expression"}))
                        .append(jQuery("<th/>", {text: "Value"}))
                    )
                ).append(tbody);
            jQuery.each(this.expressions, function (name, condition: DExpression) {
                tbody.append(jQuery("<tr/>")
                    .append(jQuery("<td/>", {text: name}))
                    .append(jQuery("<td/>", {text: condition.toString()}))
                    .append(jQuery("<td/>", {condition: name}))
                );
                condition.listen(this, true);
            }.bind(this));
            return this.debugTable;
        }

        public evaluateAll(forceCallback: boolean = false) {
            jQuery.each(this.expressions, function (name, condition: DExpression) {
                condition.calculate(forceCallback);
            }.bind(this));
        }

        public getExpression(name: string): DExpression {
            return this.expressions[name];
        }

        destroy() {
            if(this.debugTable) {
                this.debugTable.detach();
            }
        }
    }

    export class DExpression implements FieldCallback, ExpressionCallback {
        private name: string;
        private expression: DConditionBase;
        private lastValue: any;
        private callbacks: Array<ExpressionCallback> = [];
        private context: DFieldContainerInterface;

        constructor(name: string, data: any, conditions: DExpressions, context: DFieldContainerInterface) {
            this.name = name;
            this.context = context;
            this.expression = conditions.buildCondition(data);
        }

        public calculate(forceCallback: boolean = false) {
            let newValue = this.expression.evaluate(this.context);
            if (newValue !== this.lastValue || forceCallback) {
                this.callbacks.forEach(function (call) {
                    call.expressionCallback(newValue, this.lastValue, this);
                }, this);
                this.lastValue = newValue;
            }
        }

        public toString(): string {
            return this.expression.toString();
        }

        public getName(): string {
            return this.name;
        }

        public listen(callback: ExpressionCallback, callNow: boolean = false) {
            if (this.callbacks.indexOf(callback) >= 0) {
                throw new Error("Callback already present!");
            }
            this.callbacks.push(callback);
            if (callNow) {
                callback.expressionCallback(this.lastValue, this.lastValue, this);
            }
        }

        public watch(field: Expressions.DFieldInterface) {
            field.watch(this);
        }

        fieldCallback(field: Expressions.DFieldInterface) {
            this.calculate();
        }

        public resolveFields() {
            this.expression.resolveFields(this.context, this);
        }

        expressionCallback(newValue: any, oldValue: any, expression: Expressions.DExpression) {
            this.calculate();
        }
    }

    export abstract class DConditionBase {
        constructor(data: any, conditions: DExpressions) {
        }

        public abstract toString(): string;

        public abstract evaluate(form: DFieldContainerInterface): any;

        public abstract resolveFields(form: Expressions.DFieldContainerInterface, expression: Expressions.DExpression);
    }

    export abstract class DConditionSingle extends DConditionBase {
        protected expression: DConditionBase;

        constructor(data: any, conditions: DExpressions) {
            super(data, conditions);
            this.expression = conditions.buildCondition(data);
        }


        public resolveFields(form: Expressions.DFieldContainerInterface, expression: Expressions.DExpression) {
            this.expression.resolveFields(form, expression);
        }
    }

    export abstract class DConditionMultiple extends DConditionBase {
        protected sub: Array<DConditionBase> = [];

        constructor(data: Array<any>, conditions: DExpressions) {
            super(data, conditions);
            for (let i = 0; i < data.length; i++) {
                this.sub.push(conditions.buildCondition(data[i]));
            }
        }

        public toString(): string {
            let rt = [];
            for (let i = 0; i < this.sub.length; i++) {
                rt[i] = this.sub[i].toString();
            }
            return "(" + rt.join(") " + this.boolName() + " (") + ")";
        }

        protected abstract boolName(): string;


        public resolveFields(form: Expressions.DFieldContainerInterface, expression: Expressions.DExpression) {
            for (let i = 0; i < this.sub.length; i++) {
                this.sub[i].resolveFields(form, expression);
            }
        }
    }

    export class DConditionAnd extends DConditionMultiple {

        protected boolName(): string {
            return "and";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let rt = true;

            for (let i = 0; i < this.sub.length; i++) {
                if (!this.sub[i].evaluate(form)) {
                    rt = false;
                    break;
                }
            }

            return rt;
        }
    }

    export class DConditionOr extends DConditionMultiple {
        protected boolName(): string {
            return "or";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let rt = false;

            for (let i = 0; i < this.sub.length; i++) {
                if (this.sub[i].evaluate(form)) {
                    rt = true;
                    break;
                }
            }

            return rt;
        }
    }

    export class DConditionNot extends DConditionSingle {
        public toString(): string {
            return "not " + this.expression.toString();
        }


        public evaluate(form: DFieldContainerInterface): any {
            return !this.expression.evaluate(form);
        }
    }

    export class DConditionEmpty extends DConditionSingle {
        public toString(): string {
            return "empty(" + this.expression.toString() + ")";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let value = this.expression.evaluate(form);
            return value == null || (typeof value == "string" && value.trim().length == 0);
        }
    }

    export class DConditionEquals extends DConditionMultiple {
        protected boolName(): string {
            return "=";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let rt = true;
            let first = this.sub[0].evaluate(form);

            for (let i = 1; i < this.sub.length; i++) {
                let value = this.sub[i].evaluate(form);
                if (first != value) {
                    rt = false;
                    break;
                }
            }

            return rt;
        }
    }

    export class DConditionGreaterThan extends DConditionMultiple {
        protected boolName(): string {
            return ">";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let rt = false;
            let first = this.sub[0].evaluate(form);
            let second = this.sub[1].evaluate(form);

            if (first > second) {
                rt = true;
            }

            return rt;
        }
    }

    export class DConditionLessThan extends DConditionMultiple {
        protected boolName(): string {
            return "<";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let rt = false;
            let first = this.sub[0].evaluate(form);
            let second = this.sub[1].evaluate(form);

            if (first < second) {
                rt = true;
            }

            return rt;
        }
    }

    export class DConditionField extends DConditionBase {
        private field: string;

        constructor(data: any, conditions: DExpressions) {
            super(data, conditions);
            this.field = data;
        }

        public toString(): string {
            return "`" + this.field + "`";
        }

        public evaluate(form: DFieldContainerInterface): any {
            let f = form.getFieldByName(this.field);
            if (!f) {
                throw new Error("Failed to find field " + this.field);
            }
            return f.getValue();
        }

        public resolveFields(form: Expressions.DFieldContainerInterface, expression: Expressions.DExpression) {
            let f = form.getFieldByName(this.field);
            if (!f) {
                throw new Error("Failed to find field " + this.field);
            }
            expression.watch(f);
        }
    }

    export class DConditionValue extends DConditionBase {
        private value: any;

        constructor(data: any, conditions: DExpressions) {
            super(data, conditions);
            this.value = data;
        }

        public toString(): string {
            return this.value;
        }

        public evaluate(form: DFieldContainerInterface): any {
            return this.value;
        }

        public resolveFields(form: Expressions.DFieldContainerInterface, expression: Expressions.DExpression) {
        }
    }
}
