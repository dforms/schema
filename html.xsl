<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="field">
    var field = form.addField("<xsl:value-of select="@name"/>","<xsl:value-of select="@type"/>");
    <xsl:call-template name="fieldProperties"/>
    <xsl:if test="@type = 'enum'">
      <xsl:for-each select="options/option">
        field.addOption("<xsl:value-of select="text()"/>");
      </xsl:for-each>
    </xsl:if>
  </xsl:template>
  <xsl:template name="fieldProperties">
    field.setLabel("<xsl:value-of select="label"/>");
    <xsl:if test="@visible">
      field.setVisibleCondition("<xsl:value-of select="@visible"/>");
    </xsl:if>
  </xsl:template>
  <xsl:template match="multirecords">
    var field = form.beginNewSubFormRepeating("<xsl:value-of select="@name"/>");
    <xsl:call-template name="fieldProperties"/>
    form = field.getTemplate();
    <xsl:apply-templates select="field"/>
    form = form.endSubForm();
  </xsl:template>
  <xsl:template match="conditions">
    var condition = null;
    <xsl:apply-templates/>
  </xsl:template>
  <xsl:template match="condition">
    condition = new Condition("<xsl:value-of select="@id"/>",<xsl:apply-templates select="*[1]"/>);
    condition.resolveFields(form);
    conditions[condition.getName()] = condition;
  </xsl:template>
  <xsl:template match="if">new ConditionIf(<xsl:apply-templates select="*[1]"/>,
    <xsl:apply-templates select="*[2]"/>)
  </xsl:template>
  <xsl:template match="and">new ConditionAnd()
    <xsl:for-each select="*">.add(<xsl:apply-templates select="current()"/>)
    </xsl:for-each>
  </xsl:template>
  <xsl:template match="not">new ConditionNot(<xsl:apply-templates select="*[1]"/>)</xsl:template>
  <xsl:template match="or">new ConditionOr(<xsl:apply-templates/>)</xsl:template>
  <xsl:template match="equals">new ConditionEquals(<xsl:apply-templates select="*[1]"/>,<xsl:apply-templates select="*[2]"/>)</xsl:template>
  <xsl:template match="fieldValue">new ConditionFieldValue("<xsl:value-of select="@name"/>")</xsl:template>
  <xsl:template match="then">new ConditionThen(<xsl:apply-templates/>)</xsl:template>
  <xsl:template match="empty">new ConditionEmpty(<xsl:apply-templates select="*[1]"/>)</xsl:template>
  <xsl:template match="/">
    <html>
      <head>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"/>
        <script src="https://code.jquery.com/jquery-2.2.4.min.js"/>
        <script src="https://code.jquery.com/ui/1.12.0/jquery-ui.min.js"/>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"/>
        <script src="html.js"/>
        <script>
          var form = new DForm("Top");
          function save() {
          $("#json_output").val(JSON.stringify(form.toJSON()));
          return false;
          }
          function load() {
            form.setValue(JSON.parse($("#json_output").val()));
          }
        </script>
      </head>
      <body>
        <H1>DForms</H1>
        <form>
          <script>
            <xsl:for-each select="form/section">
              <xsl:apply-templates/>
            </xsl:for-each>
          </script>
          <table id="form"/>
          <input type="submit" value="Save"/>
          <input type="button" value="Load" id="load"/>
        </form>
        <script>
          <xsl:apply-templates select="form/conditions"/>
          $(function() {
          $("form").submit(function(event) {
          save();
          event.preventDefault();
          });
          $("#form").append(form.render());
          endOfConditions();
          save();
          $("#load").click(load);
          });
        </script>
        <textarea id="json_output" cols="100" rows="10">

        </textarea>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
