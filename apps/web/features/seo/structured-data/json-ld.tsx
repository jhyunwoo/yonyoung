type JsonLdValue =
  null | boolean | number | string | JsonLdValue[] | { [key: string]: JsonLdValue };

export const serializeJsonLd = (data: JsonLdValue): string => {
  return JSON.stringify(data).replace(/</gu, "\\u003c");
};

export default function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
