import Image from "next/image";
import Link from "next/link";
const images = {
  plumbing: "https://res.cloudinary.com/hfe5dzce/image/upload/v1783321892/r7zsfaniktomf5iucusb.png",
  "electrical-repair": "/images/electrical-repair.svg",
  "home-cleaning": "https://res.cloudinary.com/hfe5dzce/image/upload/v1783321920/esgg1ntn92ppo7qcyrvq.png",
  carpentry: "https://res.cloudinary.com/hfe5dzce/image/upload/v1783321047/uk0wkct6zti9ip8etryr.png",
};
export function CategoryCard({ locale, slug, name, summary, action }) { return <article className="category-card"><div className="category-card__media"><Image src={images[slug]} alt="" fill sizes="(max-width: 720px) 100vw, 33vw"/></div><div className="category-card__body"><h2>{name}</h2><p>{summary}</p><Link className="primary-button" href={`/${locale}/services/${slug}`}>{action}</Link></div></article>; }
