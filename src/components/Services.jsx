import { services } from "../data/services";
import ServiceRow from "./ServiceRow";
export default function Services() {
  return (
    <section
      className="services-section section-pad"
      id="services"
      aria-labelledby="services-title"
    >
      <div className="section-top flex items-center justify-between gap-[24px]">
        <span className="eyebrow">02 / How I can help</span>
        <span className="eyebrow">From the first idea to the final detail</span>
      </div>
      <div className="section-heading flex items-end justify-between gap-[60px]">
        <h2 className="display-title" id="services-title">
          Your next idea.
          <br />
          <em>Let’s make it work.</em>
        </h2>
        <p>
          A website, an application, a smarter workflow.
          <br />
          Let’s build the solution your business needs.
        </p>
      </div>
      <div className="service-list">
        {services.map((service, index) => (
          <ServiceRow key={service.title} service={service} index={index} />
        ))}
      </div>
      <a
        className="text-link"
        href="mailto:contact@reasadazim.com?subject=Let%E2%80%99s%20discuss%20a%20project"
      >
        Tell me what you have in mind <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
