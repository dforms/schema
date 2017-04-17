import {Form} from "../src/dforms";
import DForm = Form.DForm;
import DDefaultFactory = Form.DDefaultFactory;

test("A::Test", () => {
    let form = new DForm();
    form.loadLayout(require('../example.json'),new DDefaultFactory());
    expect(form.renderJSON({})).toEqual({
        pt_jr_id: null,
        ptt_id: null,
        lot: null,
        plan_no: null,
        volume: null,
        further_detail: null,
        ppt_restriction: null,
        ppt_dimensions: null,
        ppt_area: null,
        ppt_area_type: null,
        ppt_zone: null,
        ppt_zone_effect: null,
        ppt_lga: null,
        building_type: null,
        currentuse: null,
        propdet_year_built_circa: null,
        propdet_year_built: null,
        propdet_value_rent_actual: null,
        additions: [{propdet_year_built_additions: null, additions: null}]
    });
});
