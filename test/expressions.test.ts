import {Expressions} from "../src/expressions";
import {Form} from "../src/dforms";
import DForm = Form.DForm;
import DDefaultFactory = Form.DDefaultFactory;

test("A::Test", () => {
    let form = new DForm();
    form.loadLayout(require('../example.json'),new DDefaultFactory());
});
