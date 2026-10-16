"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
const money = (paise, locale) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "INR" }).format(
    (paise ?? 0) / 100,
  );
export function InvoiceView({ bookingId }) {
  const locale = useLocale(),
    t = useTranslations("Finance"),
    [invoice, setInvoice] = useState(null);
  useEffect(() => {
    let active = true;
    apiClient
      .ownerInvoice(bookingId)
      .then((result) => {
        if (active) setInvoice(result.data.invoice);
      })
      .catch(() => {
        if (active) setInvoice(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);
  if (invoice === null) return <p role="status">{t("loading")}</p>;
  if (!invoice) return <p className="form-alert">{t("invoiceUnavailable")}</p>;
  return (
    <article className="invoice-sheet">
      <header>
        <div>
          <p className="eyebrow">CoServe</p>
          <h2>{t("invoice")}</h2>
        </div>
        <strong>{invoice.number}</strong>
      </header>
      <p className="invoice-notice">{invoice.notice[locale]}</p>
      <dl className="detail-grid">
        <div>
          <dt>{t("issued")}</dt>
          <dd>{new Date(invoice.issuedAt).toLocaleString(locale)}</dd>
        </div>
        <div>
          <dt>{t("paymentReference")}</dt>
          <dd>{invoice.paymentReference}</dd>
        </div>
        <div>
          <dt>{t("service")}</dt>
          <dd>{invoice.serviceName[locale]}</dd>
        </div>
        <div>
          <dt>{t("cooperative")}</dt>
          <dd>{invoice.cooperativeName}</dd>
        </div>
        <div>
          <dt>{t("customer")}</dt>
          <dd>{invoice.customerName}</dd>
        </div>
        <div>
          <dt>{t("locality")}</dt>
          <dd>{invoice.localityName[locale]}</dd>
        </div>
        <div>
          <dt>{t("serviceAddress")}</dt>
          <dd>
            {invoice.addressLine}, {invoice.postalCode}
          </dd>
        </div>
      </dl>
      <table className="invoice-table">
        <thead>
          <tr>
            <th>{t("lineItem")}</th>
            <th>{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{invoice.lineItem}</td>
            <td>{money(invoice.totalPaise, locale)}</td>
          </tr>
          <tr>
            <td>{t("tax")}</td>
            <td>{money(invoice.taxPaise, locale)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th>{t("total")}</th>
            <th>{money(invoice.totalPaise, locale)}</th>
          </tr>
        </tfoot>
      </table>
      <dl className="distribution-grid">
        <div>
          <dt>{t("workerShare")}</dt>
          <dd>{money(invoice.distribution.workerPaise, locale)}</dd>
        </div>
        <div>
          <dt>{t("cooperativeShare")}</dt>
          <dd>{money(invoice.distribution.cooperativePaise, locale)}</dd>
        </div>
        <div>
          <dt>{t("welfareShare")}</dt>
          <dd>{money(invoice.distribution.welfarePaise, locale)}</dd>
        </div>
      </dl>
      <button
        className="secondary-button no-print"
        onClick={() => window.print()}
      >
        {t("print")}
      </button>
    </article>
  );
}
