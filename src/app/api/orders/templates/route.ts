import { NextResponse } from "next/server";

const salesOrdersCsv = "order_xid,ship_from_xid,ship_to_xid,item_xid,qty,declared_value,currency,release_line_id,line_number";
const purchaseOrdersCsv = "order_xid,supplier_ship_from_xid,ship_to_xid,item_xid,qty,declared_value,po_line_id,line_number,release_number,currency,early_pickup_dt,late_pickup_dt,tz_id,tz_offset,port_of_load_xid,ship_to_contact_xid,supplier_contact_xid,supplier_name,ship_to_name,inco_term,allow_partial";

export async function GET() {
  return NextResponse.json({ salesOrdersCsv, purchaseOrdersCsv });
}
