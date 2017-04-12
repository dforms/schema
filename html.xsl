<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns="http://dforms.org/v1">
  <xsl:template match="ns:field">
    var field = form.addField("<xsl:value-of select="@name"/>","<xsl:value-of select="@type"/>");
    <xsl:call-template name="fieldProperties"/>
    <xsl:if test="@type = 'enum'">
      <xsl:for-each select="ns:options/ns:option">
        field.addOption("<xsl:value-of select="text()"/>");
      </xsl:for-each>
    </xsl:if>
  </xsl:template>
  <xsl:template name="fieldProperties">
    field.setLabel("<xsl:value-of select="ns:label"/>");
    <xsl:if test="@visible">
      field.setVisibleCondition("<xsl:value-of select="@visible"/>");
    </xsl:if>
    <xsl:if test="@placeholder">
      field.setPlaceholder("<xsl:value-of select="@placeholder"/>");
    </xsl:if>
    <xsl:if test="ns:help">
      field.setHelp("<xsl:value-of select="ns:help"/>");
    </xsl:if>
  </xsl:template>
  <xsl:template match="ns:multirecords">
    var field = form.beginNewSubFormRepeating("<xsl:value-of select="@name"/>");
    <xsl:call-template name="fieldProperties"/>
    form = field.getTemplate();
    <xsl:apply-templates select="ns:field"/>
    form = form.endSubForm();
  </xsl:template>
  <xsl:template match="ns:conditions">
    var condition = null;
    <xsl:apply-templates/>
  </xsl:template>
  <xsl:template match="ns:condition">
    condition = new Condition("<xsl:value-of select="@id"/>",
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="*[1]"/>
    </xsl:call-template>
    );
    condition.resolveFields(form);
    conditions[condition.getName()] = condition;
  </xsl:template>
  <xsl:template name="conditions">
    <xsl:param name="value"/>
    <xsl:choose>
      <xsl:when test="name($value) = 'and'">
        <xsl:call-template name="and">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'or'">
        <xsl:call-template name="or">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'not'">
        <xsl:call-template name="not">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'empty'">
        <xsl:call-template name="empty">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'field'">
        <xsl:call-template name="field">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'if'">
        <xsl:call-template name="if">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'equals'">
        <xsl:call-template name="equals">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="name($value) = 'value'">
        <xsl:call-template name="value">
          <xsl:with-param name="value" select="$value"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:message terminate="yes">Unknow type
          <xsl:value-of select="name($value)"/>
        </xsl:message>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  <xsl:template name="value">
    <xsl:param name="value"/>
    <xsl:choose>
      <xsl:when test="$value/@type = 'text'">
        "<xsl:value-of select="$value/text()"/>"
      </xsl:when>
      <xsl:when test="$value/@type = 'numeric'">
        <xsl:value-of select="$value/text()"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:message terminate="yes">Unknown type
          <xsl:value-of select="$value/@type"/>
        </xsl:message>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  <xsl:template name="if"><xsl:param name="value"/>new ConditionIf(
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="$value/*[1]"/>
    </xsl:call-template>
    ,
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="$value/*[2]"/>
    </xsl:call-template>
    )
  </xsl:template>
  <xsl:template name="and">
    <xsl:param name="value"/>new ConditionAnd()
    <xsl:for-each select="$value/*">.add(
      <xsl:call-template name="conditions">
        <xsl:with-param name="value" select="current()"/>
      </xsl:call-template>
      )
    </xsl:for-each>
  </xsl:template>
  <xsl:template name="or">
    <xsl:param name="value"/>new ConditionOr()
    <xsl:for-each select="$value/*">.add(
      <xsl:call-template name="conditions">
        <xsl:with-param name="value" select="current()"/>
      </xsl:call-template>
      )
    </xsl:for-each>
  </xsl:template>
  <xsl:template name="not"><xsl:param name="value"/>new ConditionNot(
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="$value/*[1]"/>
    </xsl:call-template>
    )
  </xsl:template>
  <xsl:template name="equals"><xsl:param name="value"/>new ConditionEquals(
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="$value/*[1]"/>
    </xsl:call-template>
    ,
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="$value/*[2]"/>
    </xsl:call-template>
    )
  </xsl:template>
  <xsl:template name="field"><xsl:param name="value"/>new ConditionFieldValue("<xsl:value-of select="$value/@name"/>")
  </xsl:template>
  <xsl:template name="then">new ConditionThen()</xsl:template>
  <xsl:template name="empty"><xsl:param name="value"/>new ConditionEmpty(
    <xsl:call-template name="conditions">
      <xsl:with-param name="value" select="$value/*[1]"/>
    </xsl:call-template>
    )
  </xsl:template>
  <xsl:template match="ns:section">
    <h2>Section</h2>
  </xsl:template>
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
        <form class="form-horizontal">
          <script>
            <xsl:for-each select="ns:form/ns:section">
              <xsl:apply-templates/>
            </xsl:for-each>
          </script>
          <div id="form" style="width: 800px"/>
          <input type="submit" value="Save" class="btn btn-default"/>
          <input type="button" value="Load" class="btn btn-default" id="load"/>
        </form>
        <script>
          <xsl:apply-templates select="ns:form/ns:conditions"/>
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
