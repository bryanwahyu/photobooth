/**
 * Minimal EMVCo (QRIS-shaped) payload builder.
 * Real QRIS payloads are issued by an acquirer — this only produces a
 * structurally valid string for the mock provider / demo QR image.
 */

function tag(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildQrisPayload(input: {
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  reference: string;
}): string {
  const merchantAccount = tag("00", "ID.CO.QRIS.WWW") + tag("01", input.merchantId) + tag("02", "UMI");

  const additional = tag("05", input.reference.slice(0, 25));

  const body =
    tag("00", "01") + // payload format indicator
    tag("01", "12") + // dynamic QR
    tag("26", merchantAccount) +
    tag("52", "7994") + // merchant category: photo services
    tag("53", "360") + // IDR
    tag("54", input.amount.toFixed(2)) +
    tag("58", "ID") +
    tag("59", input.merchantName.slice(0, 25)) +
    tag("60", input.merchantCity.slice(0, 15)) +
    tag("62", additional);

  const withCrcTag = `${body}6304`;
  return withCrcTag + crc16(withCrcTag);
}
