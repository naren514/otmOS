/**
 * Oracle Transportation Management (OTM) XML Builder
 * Generates Release (Sales Order) and TransOrder (Purchase Order) XML payloads
 */

export type ReleaseLine = {
  item_xid: string;
  qty: number;
  value: number;
  currency?: string;
  line_xid?: string;
};

export type PurchaseOrderLine = {
  packaged_item_xid: string;
  qty: number;
  declared_value: number;
  item_number?: string;
  line_number?: number;
  schedule_number?: number;
  currency?: string;
};

const OTM_NS = "http://xmlns.oracle.com/apps/otm/transmission/v6.4";
const GTM_NS = "http://xmlns.oracle.com/apps/gtm/transmission/v6.4";

function makeGLogDate(dt: Date): string {
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const hour = String(dt.getUTCHours()).padStart(2, "0");
  const minute = String(dt.getUTCMinutes()).padStart(2, "0");
  const second = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}${second}`;
}

function escapeXml(text: string | number): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build Sales Order (Release) XML Payload
 */
export function buildReleaseXml(options: {
  domain: string;
  baseReleaseXid: string;
  shipFromXid: string;
  shipToXid: string;
  lines: ReleaseLine[];
  releaseIndex?: number;
  useReleaseSuffixInGid?: boolean;
  useReleaseSuffixInLineIds?: boolean;
  currency?: string;
}): string {
  const {
    domain,
    baseReleaseXid,
    shipFromXid,
    shipToXid,
    lines,
    releaseIndex = 1,
    useReleaseSuffixInGid = false,
    useReleaseSuffixInLineIds = false,
    currency = "USD",
  } = options;

  const now = new Date();
  const early = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const late = new Date(early.getTime() + 24 * 60 * 60 * 1000);

  const releaseSuffix = `R${releaseIndex}`;
  const releaseGidXid = useReleaseSuffixInGid
    ? `${baseReleaseXid}_${releaseSuffix}`
    : baseReleaseXid;
  const linePrefix = useReleaseSuffixInLineIds
    ? `${baseReleaseXid}_${releaseSuffix}`
    : baseReleaseXid;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<otm:Transmission xmlns:otm="${OTM_NS}" xmlns:gtm="${GTM_NS}">\n`;
  xml += `  <otm:TransmissionHeader>\n`;
  xml += `    <otm:TransmissionCreateDt>\n`;
  xml += `      <otm:GLogDate>${escapeXml(makeGLogDate(now))}</otm:GLogDate>\n`;
  xml += `    </otm:TransmissionCreateDt>\n`;
  xml += `  </otm:TransmissionHeader>\n`;
  xml += `  <otm:TransmissionBody>\n`;
  xml += `    <otm:GLogXMLElement>\n`;
  xml += `      <otm:Release>\n`;

  // Release GID
  xml += `        <otm:ReleaseGid>\n`;
  xml += `          <otm:Gid>\n`;
  xml += `            <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `            <otm:Xid>${escapeXml(releaseGidXid)}</otm:Xid>\n`;
  xml += `          </otm:Gid>\n`;
  xml += `        </otm:ReleaseGid>\n`;
  xml += `        <otm:TransactionCode>IU</otm:TransactionCode>\n`;

  // ShipFrom
  xml += `        <otm:ShipFromLocationRef>\n`;
  xml += `          <otm:LocationRef>\n`;
  xml += `            <otm:LocationGid>\n`;
  xml += `              <otm:Gid>\n`;
  xml += `                <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `                <otm:Xid>${escapeXml(shipFromXid)}</otm:Xid>\n`;
  xml += `              </otm:Gid>\n`;
  xml += `            </otm:LocationGid>\n`;
  xml += `          </otm:LocationRef>\n`;
  xml += `        </otm:ShipFromLocationRef>\n`;

  // ShipTo
  xml += `        <otm:ShipToLocationRef>\n`;
  xml += `          <otm:LocationRef>\n`;
  xml += `            <otm:LocationGid>\n`;
  xml += `              <otm:Gid>\n`;
  xml += `                <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `                <otm:Xid>${escapeXml(shipToXid)}</otm:Xid>\n`;
  xml += `              </otm:Gid>\n`;
  xml += `            </otm:LocationGid>\n`;
  xml += `          </otm:LocationRef>\n`;
  xml += `        </otm:ShipToLocationRef>\n`;

  // Time Window
  xml += `        <otm:TimeWindow>\n`;
  xml += `          <otm:EarlyPickupDt>\n`;
  xml += `            <otm:GLogDate>${escapeXml(makeGLogDate(early))}</otm:GLogDate>\n`;
  xml += `          </otm:EarlyPickupDt>\n`;
  xml += `          <otm:LatePickupDt>\n`;
  xml += `            <otm:GLogDate>${escapeXml(makeGLogDate(late))}</otm:GLogDate>\n`;
  xml += `          </otm:LatePickupDt>\n`;
  xml += `        </otm:TimeWindow>\n`;

  // Release Lines
  lines.forEach((line, idx) => {
    const defaultLineXid = `${linePrefix}_${String(idx + 1).padStart(3, "0")}`;
    const lineXid = line.line_xid?.trim() || defaultLineXid;
    const lineCurrency = line.currency || currency;

    xml += `        <otm:ReleaseLine>\n`;
    xml += `          <otm:ReleaseLineGid>\n`;
    xml += `            <otm:Gid>\n`;
    xml += `              <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `              <otm:Xid>${escapeXml(lineXid)}</otm:Xid>\n`;
    xml += `            </otm:Gid>\n`;
    xml += `          </otm:ReleaseLineGid>\n`;
    xml += `          <otm:TransactionCode>IU</otm:TransactionCode>\n`;

    // Item
    xml += `          <otm:PackagedItemRef>\n`;
    xml += `            <otm:PackagedItemGid>\n`;
    xml += `              <otm:Gid>\n`;
    xml += `                <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                <otm:Xid>${escapeXml(line.item_xid)}</otm:Xid>\n`;
    xml += `              </otm:Gid>\n`;
    xml += `            </otm:PackagedItemGid>\n`;
    xml += `          </otm:PackagedItemRef>\n`;

    // Quantity + Declared Value
    xml += `          <otm:ItemQuantity>\n`;
    xml += `            <otm:PackagedItemCount>${Math.floor(line.qty)}</otm:PackagedItemCount>\n`;
    xml += `            <otm:DeclaredValue>\n`;
    xml += `              <otm:FinancialAmount>\n`;
    xml += `                <otm:GlobalCurrencyCode>${escapeXml(lineCurrency)}</otm:GlobalCurrencyCode>\n`;
    xml += `                <otm:MonetaryAmount>${line.value.toFixed(2)}</otm:MonetaryAmount>\n`;
    xml += `              </otm:FinancialAmount>\n`;
    xml += `            </otm:DeclaredValue>\n`;
    xml += `          </otm:ItemQuantity>\n`;
    xml += `        </otm:ReleaseLine>\n`;
  });

  // Release Type + Refnums
  xml += `        <otm:ReleaseTypeGid>\n`;
  xml += `          <otm:Gid>\n`;
  xml += `            <otm:Xid>SALES_ORDER</otm:Xid>\n`;
  xml += `          </otm:Gid>\n`;
  xml += `        </otm:ReleaseTypeGid>\n`;

  xml += `        <otm:ReleaseRefnum>\n`;
  xml += `          <otm:ReleaseRefnumQualifierGid>\n`;
  xml += `            <otm:Gid>\n`;
  xml += `              <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `              <otm:Xid>ORDER_TYPE</otm:Xid>\n`;
  xml += `            </otm:Gid>\n`;
  xml += `          </otm:ReleaseRefnumQualifierGid>\n`;
  xml += `          <otm:ReleaseRefnumValue>SALES_ORDER</otm:ReleaseRefnumValue>\n`;
  xml += `        </otm:ReleaseRefnum>\n`;

  xml += `        <otm:ReleaseRefnum>\n`;
  xml += `          <otm:ReleaseRefnumQualifierGid>\n`;
  xml += `            <otm:Gid>\n`;
  xml += `              <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `              <otm:Xid>DIRECTION</otm:Xid>\n`;
  xml += `            </otm:Gid>\n`;
  xml += `          </otm:ReleaseRefnumQualifierGid>\n`;
  xml += `          <otm:ReleaseRefnumValue>OUTBOUND</otm:ReleaseRefnumValue>\n`;
  xml += `        </otm:ReleaseRefnum>\n`;

  xml += `      </otm:Release>\n`;
  xml += `    </otm:GLogXMLElement>\n`;
  xml += `  </otm:TransmissionBody>\n`;
  xml += `</otm:Transmission>`;

  return xml;
}

/**
 * Build Purchase Order (TransOrder) XML Payload
 */
export function buildPurchaseOrderXml(options: {
  domain: string;
  poXid: string;
  releaseMethodXid?: string;
  supplierShipFromXid: string;
  dcShipToXid: string;
  lines: PurchaseOrderLine[];
  currency?: string;
  supplierId?: string;
  supplierName?: string;
  leName?: string;
  buyer?: string;
  supplierSiteName?: string;
  revisionNum?: string;
  earlyPickupDt?: string;
  latePickupDt?: string;
  tzId?: string;
  tzOffset?: string;
  planFromLocationXid?: string;
}): string {
  const {
    domain,
    poXid,
    releaseMethodXid = "AUTO_CALC - THG",
    supplierShipFromXid,
    dcShipToXid,
    lines,
    currency = "USD",
    supplierId = "10010",
    supplierName = "SUPPLIER",
    leName = "THE HILLMAN GROUP",
    buyer = "THE HILLMAN GROUP",
    supplierSiteName = "DEFAULT",
    revisionNum = "0",
    earlyPickupDt = "20250718102700",
    latePickupDt = "20250725102700",
    tzId = "Asia/Taipei",
    tzOffset = "+08:00",
    planFromLocationXid = "CNNGB",
  } = options;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<otm:Transmission xmlns:otm="${OTM_NS}" xmlns:gtm="${GTM_NS}">\n`;
  xml += `  <otm:TransmissionHeader></otm:TransmissionHeader>\n`;
  xml += `  <otm:TransmissionBody>\n`;
  xml += `    <otm:GLogXMLElement>\n`;
  xml += `      <otm:TransOrder>\n`;
  xml += `        <otm:TransOrderHeader>\n`;

  // TransOrderGid
  xml += `          <otm:TransOrderGid>\n`;
  xml += `            <otm:Gid>\n`;
  xml += `              <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `              <otm:Xid>${escapeXml(poXid)}</otm:Xid>\n`;
  xml += `            </otm:Gid>\n`;
  xml += `          </otm:TransOrderGid>\n`;
  xml += `          <otm:TransactionCode>IU</otm:TransactionCode>\n`;

  // Release Method
  xml += `          <otm:ReleaseMethodGid>\n`;
  xml += `            <otm:Gid>\n`;
  xml += `              <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `              <otm:Xid>${escapeXml(releaseMethodXid)}</otm:Xid>\n`;
  xml += `            </otm:Gid>\n`;
  xml += `          </otm:ReleaseMethodGid>\n`;

  // InvolvedParty (SHIP FROM)
  xml += `          <otm:InvolvedParty>\n`;
  xml += `            <otm:InvolvedPartyQualifierGid>\n`;
  xml += `              <otm:Gid>\n`;
  xml += `                <otm:Xid>SHIP FROM</otm:Xid>\n`;
  xml += `              </otm:Gid>\n`;
  xml += `            </otm:InvolvedPartyQualifierGid>\n`;
  xml += `            <otm:InvolvedPartyLocationRef>\n`;
  xml += `              <otm:LocationRef>\n`;
  xml += `                <otm:LocationGid>\n`;
  xml += `                  <otm:Gid>\n`;
  xml += `                    <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `                    <otm:Xid>${escapeXml(supplierShipFromXid)}</otm:Xid>\n`;
  xml += `                  </otm:Gid>\n`;
  xml += `                </otm:LocationGid>\n`;
  xml += `              </otm:LocationRef>\n`;
  xml += `            </otm:InvolvedPartyLocationRef>\n`;
  xml += `            <otm:ContactRef>\n`;
  xml += `              <otm:Contact>\n`;
  xml += `                <otm:ContactGid>\n`;
  xml += `                  <otm:Gid>\n`;
  xml += `                    <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
  xml += `                    <otm:Xid>${escapeXml(supplierShipFromXid)}</otm:Xid>\n`;
  xml += `                  </otm:Gid>\n`;
  xml += `                </otm:ContactGid>\n`;
  xml += `              </otm:Contact>\n`;
  xml += `            </otm:ContactRef>\n`;
  xml += `          </otm:InvolvedParty>\n`;

  // OrderType
  xml += `          <otm:OrderTypeGid>\n`;
  xml += `            <otm:Gid>\n`;
  xml += `              <otm:Xid>PURCHASE_ORDER</otm:Xid>\n`;
  xml += `            </otm:Gid>\n`;
  xml += `          </otm:OrderTypeGid>\n`;

  // OrderRefnums
  const addOrderRefnum = (qualXid: string, value: string) => {
    xml += `          <otm:OrderRefnum>\n`;
    xml += `            <otm:OrderRefnumQualifierGid>\n`;
    xml += `              <otm:Gid>\n`;
    xml += `                <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                <otm:Xid>${escapeXml(qualXid)}</otm:Xid>\n`;
    xml += `              </otm:Gid>\n`;
    xml += `            </otm:OrderRefnumQualifierGid>\n`;
    xml += `            <otm:OrderRefnumValue>${escapeXml(value)}</otm:OrderRefnumValue>\n`;
    xml += `          </otm:OrderRefnum>\n`;
  };

  addOrderRefnum("SUPPLIER_ID", supplierId);
  addOrderRefnum("SUPPLIER_NAME", supplierName);
  addOrderRefnum("LE_NAME", leName);
  addOrderRefnum("BUYER", buyer);
  addOrderRefnum("SUPPLIER_SITE_NAME", supplierSiteName);
  addOrderRefnum("REVISION_NUM", revisionNum);

  xml += `        </otm:TransOrderHeader>\n`;

  // TransOrderLineDetail
  xml += `        <otm:TransOrderLineDetail>\n`;

  lines.forEach((line, idx) => {
    const lineNumber = line.line_number ?? idx + 1;
    const scheduleNumber = line.schedule_number ?? 1;
    const lineXid = `${poXid}-${String(lineNumber).padStart(3, "0")}-${String(scheduleNumber).padStart(3, "0")}`;
    const lineCurrency = line.currency || currency;

    xml += `          <otm:TransOrderLine>\n`;
    xml += `            <otm:TransOrderLineGid>\n`;
    xml += `              <otm:Gid>\n`;
    xml += `                <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                <otm:Xid>${escapeXml(lineXid)}</otm:Xid>\n`;
    xml += `              </otm:Gid>\n`;
    xml += `            </otm:TransOrderLineGid>\n`;
    xml += `            <otm:TransactionCode>IU</otm:TransactionCode>\n`;

    // Item
    xml += `            <otm:PackagedItemRef>\n`;
    xml += `              <otm:PackagedItemGid>\n`;
    xml += `                <otm:Gid>\n`;
    xml += `                  <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                  <otm:Xid>${escapeXml(line.packaged_item_xid)}</otm:Xid>\n`;
    xml += `                </otm:Gid>\n`;
    xml += `              </otm:PackagedItemGid>\n`;
    xml += `            </otm:PackagedItemRef>\n`;

    // ShipFrom
    xml += `            <otm:ShipFromLocationRef>\n`;
    xml += `              <otm:LocationRef>\n`;
    xml += `                <otm:LocationGid>\n`;
    xml += `                  <otm:Gid>\n`;
    xml += `                    <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                    <otm:Xid>${escapeXml(supplierShipFromXid)}</otm:Xid>\n`;
    xml += `                  </otm:Gid>\n`;
    xml += `                </otm:LocationGid>\n`;
    xml += `              </otm:LocationRef>\n`;
    xml += `            </otm:ShipFromLocationRef>\n`;

    // ShipTo
    xml += `            <otm:ShipToLocationRef>\n`;
    xml += `              <otm:LocationRef>\n`;
    xml += `                <otm:LocationGid>\n`;
    xml += `                  <otm:Gid>\n`;
    xml += `                    <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                    <otm:Xid>${escapeXml(dcShipToXid)}</otm:Xid>\n`;
    xml += `                  </otm:Gid>\n`;
    xml += `                </otm:LocationGid>\n`;
    xml += `              </otm:LocationRef>\n`;
    xml += `            </otm:ShipToLocationRef>\n`;

    // Quantity + Declared Value
    xml += `            <otm:ItemQuantity>\n`;
    xml += `              <otm:PackagedItemCount>${Math.floor(line.qty)}</otm:PackagedItemCount>\n`;
    xml += `              <otm:DeclaredValue>\n`;
    xml += `                <otm:FinancialAmount>\n`;
    xml += `                  <otm:GlobalCurrencyCode>${escapeXml(lineCurrency)}</otm:GlobalCurrencyCode>\n`;
    xml += `                  <otm:MonetaryAmount>${line.declared_value.toFixed(2)}</otm:MonetaryAmount>\n`;
    xml += `                  <otm:RateToBase>1.0</otm:RateToBase>\n`;
    xml += `                  <otm:FuncCurrencyAmount>0.0</otm:FuncCurrencyAmount>\n`;
    xml += `                </otm:FinancialAmount>\n`;
    xml += `              </otm:DeclaredValue>\n`;
    xml += `            </otm:ItemQuantity>\n`;

    // Time Window
    xml += `            <otm:TimeWindow>\n`;
    xml += `              <otm:EarlyPickupDt>\n`;
    xml += `                <otm:GLogDate>${escapeXml(earlyPickupDt)}</otm:GLogDate>\n`;
    xml += `                <otm:TZId>${escapeXml(tzId)}</otm:TZId>\n`;
    xml += `                <otm:TZOffset>${escapeXml(tzOffset)}</otm:TZOffset>\n`;
    xml += `              </otm:EarlyPickupDt>\n`;
    xml += `              <otm:LatePickupDt>\n`;
    xml += `                <otm:GLogDate>${escapeXml(latePickupDt)}</otm:GLogDate>\n`;
    xml += `                <otm:TZId>${escapeXml(tzId)}</otm:TZId>\n`;
    xml += `                <otm:TZOffset>${escapeXml(tzOffset)}</otm:TZOffset>\n`;
    xml += `              </otm:LatePickupDt>\n`;
    xml += `            </otm:TimeWindow>\n`;

    // PlanFromLocationGid
    xml += `            <otm:PlanFromLocationGid>\n`;
    xml += `              <otm:LocationGid>\n`;
    xml += `                <otm:Gid>\n`;
    xml += `                  <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
    xml += `                  <otm:Xid>${escapeXml(planFromLocationXid)}</otm:Xid>\n`;
    xml += `                </otm:Gid>\n`;
    xml += `              </otm:LocationGid>\n`;
    xml += `            </otm:PlanFromLocationGid>\n`;

    // OrderLineRefnums
    const addLineRefnum = (qualXid: string, value: string) => {
      xml += `            <otm:OrderLineRefnum>\n`;
      xml += `              <otm:OrderLineRefnumQualifierGid>\n`;
      xml += `                <otm:Gid>\n`;
      xml += `                  <otm:DomainName>${escapeXml(domain)}</otm:DomainName>\n`;
      xml += `                  <otm:Xid>${escapeXml(qualXid)}</otm:Xid>\n`;
      xml += `                </otm:Gid>\n`;
      xml += `              </otm:OrderLineRefnumQualifierGid>\n`;
      xml += `              <otm:OrderLineRefnumValue>${escapeXml(value)}</otm:OrderLineRefnumValue>\n`;
      xml += `            </otm:OrderLineRefnum>\n`;
    };

    addLineRefnum("LINE_NUMBER", String(lineNumber));
    addLineRefnum("SCHEDULE_NUMBER", String(scheduleNumber));
    if (line.item_number) {
      addLineRefnum("ITEM_NUMBER", line.item_number);
    }

    xml += `          </otm:TransOrderLine>\n`;
  });

  xml += `        </otm:TransOrderLineDetail>\n`;
  xml += `      </otm:TransOrder>\n`;
  xml += `    </otm:GLogXMLElement>\n`;
  xml += `  </otm:TransmissionBody>\n`;
  xml += `</otm:Transmission>`;

  return xml;
}
