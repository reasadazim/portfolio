export default function ServiceRow({ service, index }) {
  return (
    <article className="service-row" id={service.id || undefined}>
      <span className="service-number">
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <span className="service-symbol" aria-hidden="true">
        {service.symbol}
      </span>
    </article>
  );
}
