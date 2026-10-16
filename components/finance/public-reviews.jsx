"use client";

import { useLocale, useTranslations } from "next-intl";

export function PublicReviews({ value }) {
  const locale = useLocale();
  const t = useTranslations("Finance");
  if (!value?.count)
    return (
      <section className="public-reviews">
        <h2>{t("publicReviews")}</h2>
        <p className="empty-state">{t("noPublicReviews")}</p>
      </section>
    );
  return (
    <section
      className="public-reviews"
      aria-labelledby="public-reviews-heading"
    >
      <h2 id="public-reviews-heading">{t("publicReviews")}</h2>
      <p className="review-aggregate">
        <strong>{t("averageRating", { average: value.average })}</strong> ·{" "}
        {t("reviewCount", { count: value.count })}
      </p>
      <div className="market-grid">
        {value.reviews.map((review, index) => (
          <article className="finance-card" key={`${review.month}-${index}`}>
            <p>
              <strong>{t("ratingValue", { rating: review.rating })}</strong> ·{" "}
              {formatMonth(review.month, locale)}
            </p>
            {review.feedback && <p>{review.feedback}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatMonth(month, locale) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}
