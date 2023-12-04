import { SettingSchemaDesc, AppGraphInfo, PageEntity } from "@logseq/libs/dist/LSPlugin.user";

import mainStyles from "./banners.css?inline";
import { logseq as PL } from "../package.json";


type AssetData = {
  title?: string;
  banner?: string;
  bannerHeight?: string;
  bannerAlign?: string;
}

const pluginId = PL.id;

let doc: Document;
let root: HTMLElement;
let body: HTMLElement;

let isJournal: boolean;
let isHome: boolean;
let isPage: boolean;

let currentGraph: AppGraphInfo | null;
let defaultConfig: {page: AssetData, journal: AssetData};
let widgetsConfig: { calendar?: any, quote?: any };
let hidePluginProps: boolean;
let additionalSettings: any;

let lastBannerURL: string;
let autoPageBanner: boolean;
let autoPageBannerSkipPrefixSeparator: string;
const autoPageBannerURLPattern = "https://source.unsplash.com/1200x${height}?${title}";
const pluginPageProps: Array<string> = ["banner", "banner-align"];

const defaultCalendarWidth = 282
const defaultBannerHeight = 220
const defaultBannerAlign = 50
const defaultQuoteMaxWidth = 48
const defaultQuoteSize = 80

export const widgetsQuoteCleanupRegExps: RegExp[] = [
  /* order is important here */
  /\n[^:]+::[^\n]*/g,         // properties

  /\nDEADLINE:\s+<[^>]+>/g,   // task attrs
  /\nSCHEDULED:\s+<[^>]+>/g,
  /\n:LOGBOOK:(.|\n)*?:END:/g,

  /#\[\[[^\]\n]+\]\]\s*/g,    // tags with brackets
  /#[^\s\n]+(\s|\n)*/g,       // tags
  /!\[[^\]\n]+\]\([^\]]+\)/g, // images
];

const settingsArray: SettingSchemaDesc[] = [
  {
    key: "generalHeading",
    title: "⚙ General settings",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "hidePluginProps",
    title: "",
    description: "Hide plugin related page props? (will be shown only on edit)",
    type: "boolean",
    default: true,
  },
  {
    key: "widgetsCalendarHeading",
    title: "📅 Widgets: calendar",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "widgetsCalendarEnabled",
    title: "Show calendar?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["off", "journals", "everywhere"],
    default: "journals",
  },
  {
    key: "widgetsCalendarWidth",
    title: "Block calendar widget width (in px)",
    description: "",
    type: "string",
    default: "380px",
  },
  {
    key: "widgetsWeatherHeading",
    title: "⛅ Widgets: weather",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "widgetsWeatherEnabled",
    title: "Show weather?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["off", "journals", "everywhere"],
    default: "journals",
  },
  {
    key: "widgetsWeatherID",
    title: "Weather ID",
    description: "",
    type: "string",
    default: "7QOWaH4IPGGaAr4puql2",
  },
  {
    key: "widgetsQuoteHeading",
    title: "💬 Widgets: quote",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "widgetsQuoteEnabled",
    title: "Show random #quote?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["off", "journals", "everywhere"],
    default: "journals",
  },
  {
    key: "widgetsQuoteTag",
    title: "Show random quotes with this tag (case sensitive!)",
    description: "",
    type: "string",
    default: "#quote",
  },
  {
    key: "widgetsQuoteMaxWidth",
    title: "Quote width limit (in chars)",
    description: "",
    type: "string",
    default: "48ch",
  },
  {
    key: "widgetsQuoteSize",
    title: "Quote font size (relative to default calculated, in %)",
    description: "",
    type: "string",
    default: "100%",
  },
  {
    key: "widgetsCustomHeading",
    title: "📊 Widgets: custom",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "widgetsCustomEnabled",
    title: "Show custom?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["off", "journals", "everywhere"],
    default: "everywhere",
  },
  {
    key: "widgetsCustomCode",
    title: "",
    description: "Show custom HTML (iframe for ex.) as widget",
    type: "string",
    default: settingsWidgetsCustomCode,
  },
  {
    key: "journalHeading",
    title: "📆 Journal and home settings",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner for journal and home page (set empty to disable)",
    description: "",
    type: "string",
    default: settingsDefaultJournalBanner,
  },
  {
    key: "journalBannerHeight",
    title: "Banner height for journal & home page",
    description: "",
    type: "string",
    default: "280px",
  },
  {
    key: "journalBannerAlign",
    title: "Default banner vertical align for journal and home page",
    description: "",
    type: "string",
    default: "50%"
  },
  {
    key: "defaultJournalIcon",
    title: "Default icon (emoji) for journal and home page (set empty to disable)",
    description: "",
    type: "string",
    default: "📅",
  },
  {
    key: "journalIconWidth",
    title: "Icon width for journal & home page (in px)",
    description: "",
    type: "string",
    default: "50px",
  },
  {
    key: "pageHeading",
    title: "📄 Common page settings",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "defaultPageBanner",
    title: "Default banner for common page (set empty to disable)",
    description: "",
    type: "string",
    default: settingsDefaultPageBanner,
  },
  {
    key: "pageBannerHeight",
    title: "Banner height for common page",
    description: "",
    type: "string",
    default: "280px",
  },
  {
    key: "pageBannerAlign",
    title: "Default banner vertical align for common page",
    description: "",
    type: "string",
    default: "50%"
  },
  {
    key: "defaultPageIcon",
    title: "Default icon (emoji) for common page (set empty to disable)",
    description: "",
    type: "string",
    default: "📄",
  },
  {
    key: "pageIconWidth",
    title: "Icon width for common page (in px)",
    description: "",
    type: "string",
    default: "40px",
  },
  {
    key: "advancedHeading",
    title: "☢️ Advanced settings",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "autoPageBanner",
    title: "Turn on auto page banner mode?",
    type: "boolean",
    description: "Autogenerate banner image URL according to the page title",
    default: "false",
  },
  {
    key: "customPropsConfig",
    title: "Custom pages banners and icons config",
    description: "",
    type: "object",
    default: {
      "pageType": {
        "evrgrn": {
          "pageIcon": "🌳",
          "banner": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
          "bannerHeight": "200px",
          "bannerAlign": "50%"
        },
        "seed": {
          "pageIcon": "🌱",
          "banner": "https://images.unsplash.com/photo-1631949454967-6c6d07fb59cd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
          "bannerHeight": "200px",
          "bannerAlign": "50%"
        }
      },
      "anotherCamalCasedPropName": {}
    }
  },
  {
    // settings inside this object shouldn't be display in UI
    key: "additional",
    title: "A set of additional settings intended for more sensitive plugin tuning",
    description: "",
    type: "object",
    default: {
      quoteWidget: {
        cleanupRegExps_before: [],
        cleanupRegExps_after: []
      }
    }
  }
]


function initStyles() {
  logseq.provideStyle(mainStyles);
}

function setCSSVars() {
  setTimeout(() => {
    setWidgetPrimaryColors();
  }, 500)
  root.style.setProperty("--widgetsCalendarWidth", widgetsConfig.calendar.width);
}

export function readPluginSettings() {
  widgetsConfig = {
    calendar: {},
    quote: {},
  }

  defaultConfig = {
    page: {},
    journal: {}
  }

  if (logseq.settings) {
    ({
      hidePluginProps,

      widgetsCalendarEnabled: widgetsConfig.calendar.enabled,
      widgetsCalendarWidth: widgetsConfig.calendar.width,

      widgetsQuoteEnabled: widgetsConfig.quote.enabled,
      widgetsQuoteTag: widgetsConfig.quote.tag,
      widgetsQuoteMaxWidth: widgetsConfig.quote.maxwidth,
      widgetsQuoteSize: widgetsConfig.quote.size,

      autoPageBanner,
      autoPageBannerSkipPrefixSeparator,
      defaultPageBanner: defaultConfig.page.banner,
      pageBannerHeight: defaultConfig.page.bannerHeight,
      pageBannerAlign: defaultConfig.page.bannerAlign,

      defaultJournalBanner: defaultConfig.journal.banner,
      journalBannerHeight: defaultConfig.journal.bannerHeight,
      journalBannerAlign: defaultConfig.journal.bannerAlign,

      additional: additionalSettings
    } = logseq.settings);
  }

  for (const [ container, key, defaultValue, suffix, minValue, maxValue ] of [
    [widgetsConfig.calendar, 'width', defaultCalendarWidth, 'px', defaultCalendarWidth],
    [defaultConfig.page, 'bannerHeight', defaultBannerHeight, 'px', defaultBannerHeight],
    [defaultConfig.journal, 'bannerHeight', defaultBannerHeight, 'px', defaultBannerHeight],
    [defaultConfig.page, 'bannerAlign', defaultBannerAlign, '%', 0, 100],
    [defaultConfig.journal, 'bannerAlign', defaultBannerAlign, '%', 0, 100],
    [widgetsConfig.quote, 'maxwidth', defaultQuoteMaxWidth, 'ch', 0],
    [widgetsConfig.quote, 'size', defaultQuoteSize, '%', 20],
  ]) {
    container[key] ||= defaultValue.toString()
    if (container[key].endsWith(suffix))
      container[key] = container[key].slice(0, -suffix.length)

    let value = Number(container[key]) || defaultValue
    value = Math.max(minValue, value)
    if (maxValue)
      value = Math.min(maxValue, value)
    container[key] = `${value}${suffix}`
  }

  cacheDefaultBanners();
}

async function getBase64FromImageUrl(url: string): Promise<string> {
  let data;
  try {
    data = await fetch(url);
  } catch (error) {
    return "";
  }
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data);
    }
  });
}

async function cacheDefaultBanners() {
  if (defaultConfig.page.banner && !(defaultConfig.page.banner.includes("source.unsplash.com"))) {
    defaultConfig.page.banner = await getBase64FromImageUrl(cleanBannerURL(defaultConfig.page.banner));
  }
  if (defaultConfig.journal.banner && !(defaultConfig.journal.banner.includes("source.unsplash.com"))) {
    defaultConfig.journal.banner = await getBase64FromImageUrl(cleanBannerURL(defaultConfig.journal.banner));
  }
}

function getRGBValues(color: string) {
  const canvas = document.createElement('canvas');
  canvas.height = 1;
  canvas.width = 1;
  const context = canvas.getContext('2d');
  context!.fillStyle = color;
  context!.fillRect(0, 0, 1, 1);
  const rgbaArray = context!.getImageData(0, 0, 1, 1).data;
  return `${rgbaArray[0]}, ${rgbaArray[1]}, ${rgbaArray[2]}`;
}

function setWidgetPrimaryColors() {
  const primaryTextcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-text-color').trim();
  root.style.setProperty("--widgetsTextColor", getRGBValues(primaryTextcolor));
  const primaryBgcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-background-color').trim();
  root.style.setProperty("--widgetsBgColor", getRGBValues(primaryBgcolor));
}

function hidePageProps() {
  const propBlockKeys = doc.getElementsByClassName("page-property-key");
  if (propBlockKeys?.length) {
    for (let i = 0; i < propBlockKeys.length; i++) {
      const propKey = propBlockKeys[i].textContent;
      if (propKey) {
        if (pluginPageProps.includes(propKey)) {
          propBlockKeys[i].parentElement!.parentElement!.style.display = hidePluginProps ? "none" : "block" ;
        }
      }
    }
  }
}

function getPageType() {
  isPage = false;
  isHome = false;
  const pageType = body.getAttribute("data-page");
  if (pageType === "home" || pageType === "all-journals") {
    isHome = true;
    isPage = false;
  }
  if (pageType === "page") {
    isPage = true;
    isHome = false;
  }
}

async function getPageAssetsData(currentPageData: any): Promise<AssetData> {
  let pageAssetsData = { ...defaultConfig.journal } as AssetData;
  let currentPageProps: any = {};

  // home = journal page?
  if (isHome) {
    console.debug(`#${pluginId}: Homepage`);
    return pageAssetsData;
  }

  // journal page?
  isJournal = currentPageData["journal?"];
  if (isJournal) {
    console.debug(`#${pluginId}: Journal page`);
    return pageAssetsData;
  }

  // common page?
  console.debug(`#${pluginId}: Trying page props`);
  currentPageProps = currentPageData.properties;
  if (currentPageProps) {
    pageAssetsData = { ...defaultConfig.page, ...currentPageProps }
  } else {
    console.debug(`#${pluginId}: Default page`);
    pageAssetsData = { ...defaultConfig.page };
  }

  // Add title
  if (currentPageData.name) {
    let name = currentPageData.name.replaceAll(/[\])}[{(]/g, "").replaceAll("/", "-")

    // TODO: my personal setup: review it when merging to main repo
    const skipSuffix = autoPageBannerSkipPrefixSeparator
    if (name.includes(skipSuffix)) {
      name = name.split(skipSuffix).slice(1).join(skipSuffix)
    }

    pageAssetsData.title = (name
      .split(" ")
      .filter((x: string) => x.length > 3)
      .slice(0, 3)
      .join("-")
    );
  }

  console.debug(`#${pluginId}:`, {pageAssetsData});
  return pageAssetsData;
}

async function getPageData(): Promise<PageEntity | null> {
  let currentPageData = await logseq.Editor.getCurrentPage();
  if (!currentPageData)
    return null;

  // Check if it is a child and get parent ID
  const currentPageId = currentPageData.page?.id;
  if (currentPageId)
    currentPageData = await logseq.Editor.getPage(currentPageId);

  return currentPageData as PageEntity;
}

function cleanBannerURL(url: string) {
  // remove surrounding quotations if present
  url = url.replace(/^"(.*)"$/, '$1');

  // if local image from assets folder
  if (url.startsWith("../")) {
    url = encodeURI("file://" + currentGraph?.path + url.replace("..", ""));
  }

  return url;
}

async function _renderBanner(pageAssetsData: AssetData, currentPageData: any): Promise<boolean> {
  if (pageAssetsData.banner) {
    // Set banner CSS variable
    body.classList.add("is-banner-active");
    root.style.setProperty("--bannerHeight", `${pageAssetsData.bannerHeight}`);
    root.style.setProperty("--bannerAlign", `${pageAssetsData.bannerAlign}`);

    pageAssetsData.banner = cleanBannerURL(pageAssetsData.banner);

    root.style.setProperty("--pageBanner", `url(${pageAssetsData.banner})`);
  } else {
    // clear old banner
    clearBanner();
    return false;
  }

  if (currentPageData && currentPageData.properties && !currentPageData.properties["banner"]) {
    if (autoPageBanner && pageAssetsData.title) {
      const defaultHeight = settingsArray.find(item => {return item.key == "pageBannerHeight"})!.default as string;
      const height = (pageAssetsData.bannerHeight || defaultHeight).replace("px", "");

      pageAssetsData.banner = (autoPageBannerURLPattern
        .replace("${height}", height)
        .replace("${title}", pageAssetsData.title)
      );
      console.debug(`#${pluginId}: Auto banner: ${JSON.stringify(pageAssetsData.banner)}`);
    }
  }

  const bannerImage = await getImagebyURL(pageAssetsData.banner);
  if (bannerImage) {
    pageAssetsData.banner = bannerImage;
  } else {
    pageAssetsData.banner = defaultConfig.page.banner;
  }
  root.style.setProperty("--pageBanner", `url(${pageAssetsData.banner})`);

  return true;
}

async function getImagebyURL(url: string) {
  let response = await fetch(url)
  if (response.status === 200) {
    if (response.url.includes("source-404")) {
      return "";   // for unsplash.com: requested image not found
    }
    lastBannerURL = response.url;
    const imageBlob = await response.blob();
    return URL.createObjectURL(imageBlob);
  }
  else {
    console.info(`#${pluginId}: HTTP-Error: ${response.status}`);
    return "";
  }
}

function clearBanner() {
  body.classList.remove("is-banner-active");
  root.style.setProperty("--pageBanner", "");
  root.style.setProperty("--bannerHeight", "");
  root.style.setProperty("--bannerAlign", "");
}

// Page props was edited
let propsChangedObserverConfig: MutationObserverInit;
let propsChangedObserver: MutationObserver;

function propsChangedObserverInit() {
  propsChangedObserverConfig = {
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
    subtree: true
  }
  const propsChangedCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
      if (mutationsList[i].oldValue?.includes("pre-block")){
        console.info(`#${pluginId}: page props - deleted`);
        renderBanner();
        return;
      }
      //@ts-expect-error
      if (mutationsList[i]?.target?.offsetParent?.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper"){
        console.info(`#${pluginId}: page props - edited or added`);
        renderBanner();
      }
    }
  }
  propsChangedObserver = new MutationObserver(propsChangedCallback);
}
function propsChangedObserverRun() {
  const preBlock = doc.getElementsByClassName("content")[0]?.firstChild?.firstChild?.firstChild?.firstChild;
  if (preBlock) {
    propsChangedObserver.observe(preBlock, propsChangedObserverConfig);
  }
}
function propsChangedObserverStop() {
  propsChangedObserver.disconnect();
}

// Page changed
function routeChangedCallback() {
  console.debug(`#${pluginId}: page route changed`);
  // Content reloaded, so need reconnect props listeners
  propsChangedObserverStop();

  renderBanner();

  setTimeout(() => {
    propsChangedObserverRun();
  }, 200)
}

function onSettingsChangedCallback() {
  readPluginSettings();
  setCSSVars();
  renderBanner();
}

function onThemeModeChangedCallback() {
  setTimeout(() => {
    setWidgetPrimaryColors();
  }, 300)
}

async function onCurrentGraphChangedCallback() {
  currentGraph = (await logseq.App.getCurrentGraph());
}

function onPluginUnloadCallback() {
  // clean up
  top!.document.getElementById("banner")?.remove();
  body.classList.remove("is-banner-active");
  body.classList.remove("is-icon-active");
}

function renderPlaceholder() {
  // Widgets area
  if (!doc.getElementById("banner")) {
    const container = doc.getElementById("main-content-container");
    if (container) {
      container.insertAdjacentHTML(
        "afterbegin",
        `<div id="banner">
          <div id="banner-widgets">
            <div id="banner-widgets-calendar"></div>
          </div>
        </div>`
      );
    }
  }
}
function showPlaceholder() {
  doc.getElementById("banner")!.style.display = "block";
}
function hidePlaceholder() {
  doc.getElementById("banner")!.style.display = "none";
}

async function renderWidgets() {
  const isWidgetCalendarRendered = renderWidgetCalendar();
  if (isWidgetCalendarRendered) {
    doc.getElementById("banner-widgets")?.classList.add("banner-widgets-bg");
  } else {
    doc.getElementById("banner-widgets")?.classList.remove("banner-widgets-bg");
  }
  renderWidgetQuote();
}

function renderWidgetCalendar() {
  const bannerWidgetsCalendar = doc.getElementById("banner-widgets-calendar");
  if (widgetsConfig.calendar.enabled === "off" || (widgetsConfig.calendar.enabled === "journals" && !(isHome || isJournal))) {
    bannerWidgetsCalendar!.style.display = "none";
    return false;
  }
  bannerWidgetsCalendar!.style.display = "block";
  return true;
}

async function renderWidgetQuote() {
  if (widgetsConfig.quote.enabled === "off" || (widgetsConfig.quote.enabled === "journals" && !(isHome || isJournal))) {
    doc.getElementById("banner-widgets-quote")?.remove();
    return;
  }

  const quote = await getRandomQuote();
  if (!quote) {
    doc.getElementById("banner-widgets-quote")?.remove();
    return;
  }

  root.style.setProperty("--widgetsQuoteFS", getFontSize(quote.length));
  root.style.setProperty("--widgetsQuoteSize", widgetsConfig.quote.size);
  root.style.setProperty("--widgetsQuoteMaxWidth", widgetsConfig.quote.maxwidth);

  const quoteTextEl = doc.getElementById("banner-widgets-quote-text");
  if (quoteTextEl) {
    quoteTextEl.remove();
    doc.getElementById("banner-widgets-quote-block")?.insertAdjacentHTML("beforeend", `<div id="banner-widgets-quote-text">${quote}</div>`);
  } else {
    doc.getElementById("banner-widgets")?.insertAdjacentHTML("beforeend", `<div id="banner-widgets-quote"><div id="banner-widgets-quote-block"><div id="banner-widgets-quote-text">${quote}</div></div></div>`);
  }
}

function getFontSize(textLength: number): string {
  if(textLength > 200) {
    return "1.2em"
  }
  if(textLength > 150) {
    return "1.25em"
  }
  return "1.3em"
}

async function replaceAsync(str: string, regex: RegExp, asyncFn: (match: any, ...args: any) => Promise<any>) {
  const promises: Promise<any>[] = []
  str.replace(regex, (match, ...args) => {
    promises.push(asyncFn(match, args))
    return match
  })
  const data = await Promise.all(promises)
  return str.replace(regex, () => data.shift())
}

export function cleanQuote(text: string) {
  const tag = widgetsConfig.quote.tag.replace("#", "");

  // User cleanup before
  let regexps: string[] = additionalSettings?.quoteWidget?.cleanupRegExps_before || [];
  for (const cleanupRegExp of regexps) {
    text = text.replaceAll(new RegExp(cleanupRegExp, "g"), "").trim();
  }

  // Delete searched tag
  const regExpTag = new RegExp(`#${tag}\\b`, "gi");
  text = text.replaceAll(regExpTag, "").trim();

  // Cleanup
  for (const cleanupRegExp of widgetsQuoteCleanupRegExps) {
    text = text.replaceAll(cleanupRegExp, "").trim()
  }

  // Add Markdown bold, italics, strike-through, highlight & code to HTML
  text = text.replaceAll(/\*\*(.*?)\*\*/g, "<b>$1</b>").replaceAll(/__(.*?)__/g, "<b>$1</b>");
  text = text.replaceAll(/\*(.*?)\*/g, "<i>$1</i>").replaceAll(/_(.*?)_/g, "<i>$1</i>");
  text = text.replaceAll(/==(.*?)==/g, "<mark>$1</mark>").replaceAll(/\^\^(.*?)\^\^/g, "<mark>$1</mark>");
  text = text.replaceAll(/~~(.*?)~~/g, "<s>$1</s>");
  text = text.replaceAll(/`(.*?)`/g, "<code>$1</code>");

  // Clear Markdown links & wiki-links
  text = text.replaceAll(/\[\[(.*?)\]\]/g, "$1");
  text = text.replaceAll(/\[([^\]\n]+)\]\([^\]]+\)/g, "$1");

  // Keep lines breaks
  text = text.replaceAll("\n", "<br/>");

  // User cleanup after
  regexps = additionalSettings?.quoteWidget?.cleanupRegExps_after || [];
  for (const cleanupRegExp of regexps) {
    text = text.replaceAll(new RegExp(cleanupRegExp, "g"), "").trim();
  }

  return text;
}

async function getRandomQuote() {
  const tag = widgetsConfig.quote.tag.replace('#', '');
  const query = `[
    :find ?content ?block-id
    :where
      [?b :block/refs ?r]
      [?r :block/name "${tag}"]
      (not (?b :block/marker))

      [?b :block/uuid ?block-uuid]
      [(str ?block-uuid) ?block-id]

      [?b :block/content ?content]
  ]`;
  const quotesList = await logseq.DB.datascriptQuery(query);
  if (!quotesList.length) {
    return null;
  }

  const randomQuoteBlock = quotesList[Math.floor(Math.random() * quotesList.length)];
  let quoteHTML = randomQuoteBlock[0];

  // Check is content refers to another block
  quoteHTML = await replaceAsync(quoteHTML,
    /\(\((\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\)\)/g,
    async (matched: string, [uuid]: any) => {
      const query = `[
        :find ?content
        :where
          [?b :block/uuid #uuid "${uuid}"]
          [?b :block/content ?content]
      ]`;
      const ref = await logseq.DB.datascriptQuery(query);
      if (ref.length) {
        return cleanQuote(ref[0][0]);
      }
      return matched;
    }
  );

  quoteHTML = cleanQuote(quoteHTML);

  const blockId = randomQuoteBlock[1];
  const pageURL = encodeURI(`logseq://graph/${currentGraph?.name}?block-id=${blockId}`);
  quoteHTML = `<a href=${pageURL} id="banner-widgets-quote-link">${quoteHTML}</a>`;
  return quoteHTML;
}

async function renderBanner() {
  getPageType();

  if (!(isHome || isPage)) {
    clearBanner();
    return;
  }

  hidePageProps();

  const currentPageData = await getPageData();

  let pageAssetsData: AssetData | null = null;
  pageAssetsData = await getPageAssetsData(currentPageData);
  if (pageAssetsData) {
    if (!pageAssetsData.banner || pageAssetsData.banner === "false" || pageAssetsData.banner === "off" || pageAssetsData.banner === "none" || pageAssetsData.banner === '""'  || pageAssetsData.banner === "''") {
      clearBanner();
      return;
    }

    const isBannerRendered = await _renderBanner(pageAssetsData, currentPageData);
    if (isBannerRendered) {
      renderWidgets();
      showPlaceholder();
    }
  }
}

async function commandSaveBanner() {
  const currentPage = await getPageData();
  const properties = currentPage.properties ?? {};

  const currentBanner = lastBannerURL;
  const pageBanner = properties["banner"];
  if (pageBanner && pageBanner !== currentBanner) {
    logseq.UI.showMsg(
      'There is the "banner" property in this page with a different value. Remove it manually and run this command again.',
      "warning",
      {timeout: 10000},
    );
    return;
  }

  const pageBannerAlign = properties["banner-align"];
  const currentBannerAlign = pageBannerAlign || getComputedStyle(root).getPropertyValue("--bannerAlign");

  const [ propertiesBlock ] = await logseq.Editor.getPageBlocksTree(currentPage.name);
  await logseq.Editor.upsertBlockProperty(propertiesBlock.uuid, "banner", currentBanner);
  await logseq.Editor.upsertBlockProperty(propertiesBlock.uuid, "banner-align", currentBannerAlign);

  logseq.UI.showMsg("Current banner saved to page properties");
}

async function main() {
  console.info(`#${pluginId}: Loaded`);

  currentGraph = (await logseq.App.getCurrentGraph());

  logseq.useSettingsSchema(settingsArray);
  doc = top!.document;
  root = doc.documentElement;
  body = doc.body;

  initStyles();

  renderPlaceholder();
  hidePlaceholder();

  setTimeout(() => {
    readPluginSettings();
    setCSSVars();
    renderBanner();
  }, 500)

  // Listeners late run
  propsChangedObserverInit();

  logseq.App.registerCommandPalette({
      key: "banners-save-for-page",
      label: "Banners → Save banner for this page",
  }, async (e) => {
    commandSaveBanner();
  });

  // Secondary listeners
  setTimeout(() => {
    // Listen for page props
    propsChangedObserverRun();

    // Listen for pages switch
    logseq.App.onRouteChanged( async () => {
      routeChangedCallback();
    })

    // Listen settings update
    logseq.onSettingsChanged(() => {
      onSettingsChangedCallback();
    })

    // Listen for theme mode changed
    logseq.App.onThemeModeChanged( () => {
      onThemeModeChangedCallback();
    })

    // Listen for graph changed
    logseq.App.onCurrentGraphChanged( () => {
      onCurrentGraphChangedCallback();
    })

    // Listen plugin unload
    logseq.beforeunload( async () => {
      onPluginUnloadCallback();
    })
  }, 2000);
}

export const App = (logseq: any) => {
  logseq?.ready(main).catch(console.error);
}
