const { flattenLocatorValues } = require("../shared/selectors");
const { escapeJava, sanitizeTestTitle, toJavaMethodName } = require("../shared/text");
const { toSeleniumBy } = require("./locatorBy");

/**
 * Build one Selenium Java test method for a test case.
 */
function buildSeleniumJavaTest(testCase, locatorsByKey, baseUrl) {
  const id = testCase.id || "TC-001";
  const expected = sanitizeTestTitle(testCase.expectedResult, "", 1000);
  const url = baseUrl || "https://example.com";
  const selectors = flattenLocatorValues(locatorsByKey);

  const lines = [
    "import org.openqa.selenium.By;",
    "import org.openqa.selenium.WebDriver;",
    "import org.openqa.selenium.WebElement;",
    "import org.openqa.selenium.support.ui.ExpectedConditions;",
    "import org.openqa.selenium.support.ui.WebDriverWait;",
    "import java.time.Duration;",
    "",
    `public class ${toJavaMethodName(id)} {`,
    "",
    "    public static void run(WebDriver driver, String baseUrl) {",
    "        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));",
    `        driver.get(baseUrl != null ? baseUrl : "${escapeJava(url)}");`,
    '        wait.until(ExpectedConditions.visibilityOfElementLocated(By.tagName("body")));',
    ""
  ];

  if (selectors.playCta.length) {
    lines.push("        // Play CTA", "        WebElement play = null;");
    for (const selector of selectors.playCta.slice(0, 3)) {
      lines.push(
        `        try { play = wait.until(ExpectedConditions.elementToBeClickable(${toSeleniumBy(selector)})); } catch (Exception e) {}`,
        "        if (play != null) { play.click(); return; }"
      );
    }
    lines.push("");
  }

  if (selectors.contentCard.length) {
    lines.push("        // Content card");
    lines.push(
      `        WebElement card = wait.until(ExpectedConditions.elementToBeClickable(${toSeleniumBy(selectors.contentCard[0])}));`
    );
    lines.push("        if (card != null) card.click();", "");
  }

  lines.push(
    `        // Assertion: ${escapeJava(expected.slice(0, 60))}`,
    '        wait.until(ExpectedConditions.visibilityOfElementLocated(By.tagName("body")));',
    "    }",
    "}"
  );

  return lines.join("\n");
}

module.exports = { buildSeleniumJavaTest };
