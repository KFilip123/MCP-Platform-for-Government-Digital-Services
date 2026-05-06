import { useState, useEffect, useCallback } from "react";
import { sendMojterminContact, sendCrmContact, fetchUslugiCaptcha, sendUslugiContact } from "../../api/services";

const CRM_TOPICS = [
  { id: 1, label: "Пофалби (Compliments)" },
  { id: 2, label: "Поплаки (Complaints)" },
  { id: 3, label: "Прашања (Questions)" },
];

const USLUGI_TICKET_TYPES = [
  { key: 1, label: "Услуга (Service)", isSubtype: false },
  { key: 2, label: "Институција (Institution)", isSubtype: false },
  { key: 1, label: "Останато › Најава (Login)", isSubtype: true },
  { key: 2, label: "Останато › Плаќање (Payment)", isSubtype: true },
  { key: 3, label: "Останато › Регистрација (Registration)", isSubtype: true },
  { key: 4, label: "Останато › eID", isSubtype: true },
  { key: 5, label: "Останато › Друго (Other)", isSubtype: true },
];

const INSTITUTION_DETAILS = {
  uslugi: {
    fullName: "Ministry of Information Society and Administration",
    address: "Bul. Sv. Kliment Ohridski 54, 1000 Skopje",
    phone: "+389 2 3200 800",
    email: "info@mioa.gov.mk",
    workingHours: "Mon–Fri, 08:30–16:30",
    mapQuery: "Ministry+of+Information+Society+Skopje+North+Macedonia",
  },
  mojtermin: {
    fullName: "Ministry of Health of North Macedonia",
    address: "50-ta Divizija 14, 1000 Skopje",
    phone: "+389 2 3112 500",
    email: "contact@zdravstvo.gov.mk",
    workingHours: "Mon–Fri, 08:30–16:30",
    mapQuery: "Ministry+of+Health+Skopje+North+Macedonia+50+ta+divizija",
  },
  crm: {
    fullName: "Central Registry of North Macedonia",
    address: "Bul. Kuzman Josifovski Pitu 1, 1000 Skopje",
    phone: "+389 2 3290 280",
    email: "info@crm.com.mk",
    workingHours: "Mon–Fri, 08:00–16:00",
    mapQuery: "Central+Registry+North+Macedonia+Skopje",
  },
};

function UslugiContactForm() {
  const [form, setForm] = useState({
    ticketTypeKey: 1,
    ticketTypeIsSubtype: false,
    ticketTitle: "",
    ticketBody: "",
    userEmail: "",
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaUrl, setCaptchaUrl] = useState(null);
  const [captchaValue, setCaptchaValue] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const { blob, token } = await fetchUslugiCaptcha();
      const url = URL.createObjectURL(blob);
      setCaptchaUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      setCaptchaToken(token);
      setCaptchaValue("");
    } catch {
      // ignore captcha load failure
    }
  }, []);

  useEffect(() => { loadCaptcha(); }, [loadCaptcha]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleTypeChange = (e) => {
    const [key, isSubtype] = e.target.value.split("|");
    setForm((f) => ({ ...f, ticketTypeKey: Number(key), ticketTypeIsSubtype: isSubtype === "true" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!captchaToken) return;
    setLoading(true);
    setStatus(null);
    try {
      await sendUslugiContact({
        captcha_token: captchaToken,
        captcha_value: captchaValue,
        ticket_type_key: form.ticketTypeKey,
        ticket_type_is_subtype: form.ticketTypeIsSubtype,
        ticket_title: form.ticketTitle,
        ticket_body: form.ticketBody,
        user_email: form.userEmail || null,
      });
      setStatus("success");
      setForm({ ticketTypeKey: 1, ticketTypeIsSubtype: false, ticketTitle: "", ticketBody: "", userEmail: "" });
      loadCaptcha();
    } catch (err) {
      setStatus(err?.response?.status === 400 ? "captcha_error" : "error");
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors placeholder-gray-500";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h4 className="text-white font-semibold text-sm">Постави прашање / Submit a Question</h4>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Тип на прашање (Type)*</label>
        <select
          required
          value={`${form.ticketTypeKey}|${form.ticketTypeIsSubtype}`}
          onChange={handleTypeChange}
          className={inputCls}
        >
          {USLUGI_TICKET_TYPES.map((t, i) => (
            <option key={i} value={`${t.key}|${t.isSubtype}`}>{t.label}</option>
          ))}
        </select>
      </div>

      <input
        required
        placeholder="Прашање* (Question title)"
        value={form.ticketTitle}
        onChange={set("ticketTitle")}
        className={inputCls}
      />

      <textarea
        required
        placeholder="Повеќе детали за прашањето* (More details)"
        value={form.ticketBody}
        onChange={set("ticketBody")}
        rows={4}
        className={`${inputCls} resize-none`}
      />

      <input
        type="email"
        placeholder="Електронска адреса за контакт (Email — optional if logged in)"
        value={form.userEmail}
        onChange={set("userEmail")}
        className={inputCls}
      />

      {/* CAPTCHA */}
      <div className="space-y-2">
        <label className="text-gray-400 text-xs block">Внесете ги карактерите од сликата* (CAPTCHA)</label>
        <div className="flex items-center gap-3">
          {captchaUrl ? (
            <img src={captchaUrl} alt="CAPTCHA" className="h-12 rounded border border-gray-700" />
          ) : (
            <div className="h-12 w-24 bg-gray-800 rounded border border-gray-700 animate-pulse" />
          )}
          <button
            type="button"
            onClick={loadCaptcha}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-gray-700 rounded-lg transition-colors"
          >
            ↺ Refresh
          </button>
        </div>
        <input
          required
          placeholder="Enter CAPTCHA characters"
          value={captchaValue}
          onChange={(e) => setCaptchaValue(e.target.value)}
          className={inputCls}
        />
      </div>

      {status === "success" && (
        <p className="text-green-400 text-xs">Прашањето е испратено успешно! (Question sent successfully.)</p>
      )}
      {status === "captcha_error" && (
        <p className="text-red-400 text-xs">Невалиден CAPTCHA. Обидете се повторно. (Invalid CAPTCHA — please try again.)</p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-xs">Грешка при испраќање. Обидете се повторно. (Failed to send — please try again.)</p>
      )}

      <button
        type="submit"
        disabled={loading || !captchaToken}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Испраќање... (Sending...)" : "Испрати (Send)"}
      </button>
    </form>
  );
}

function ContactForm({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await sendMojterminContact(form.name, form.email, form.message);
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors placeholder-gray-500";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h4 className="text-white font-semibold text-sm">Send a Message</h4>
      <input
        required
        placeholder="Full name"
        value={form.name}
        onChange={set("name")}
        className={inputCls}
      />
      <input
        required
        type="email"
        placeholder="Email address"
        value={form.email}
        onChange={set("email")}
        className={inputCls}
      />
      <textarea
        required
        placeholder="Your message"
        value={form.message}
        onChange={set("message")}
        rows={4}
        className={`${inputCls} resize-none`}
      />
      {status === "success" && (
        <p className="text-green-400 text-xs">Message sent successfully.</p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-xs">Failed to send. Please try again.</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

function CrmContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: 3, subject: "", message: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: field === "topic" ? Number(e.target.value) : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await sendCrmContact(form.name, form.email, form.topic, form.subject, form.message);
      setStatus("success");
      setForm({ name: "", email: "", topic: 3, subject: "", message: "" });
    } catch (err) {
      if (err?.response?.status === 412) {
        setStatus("captcha");
      } else {
        setStatus("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors placeholder-gray-500";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h4 className="text-white font-semibold text-sm">Send a Message</h4>

      <input required placeholder="Full name" value={form.name} onChange={set("name")} className={inputCls} />
      <input required type="email" placeholder="Email address" value={form.email} onChange={set("email")} className={inputCls} />

      <select required value={form.topic} onChange={set("topic")} className={inputCls}>
        {CRM_TOPICS.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      <input required placeholder="Subject" value={form.subject} onChange={set("subject")} className={inputCls} />
      <textarea
        required
        placeholder="Your message"
        value={form.message}
        onChange={set("message")}
        rows={4}
        className={`${inputCls} resize-none`}
      />

      {status === "success" && (
        <p className="text-green-400 text-xs">Message sent successfully.</p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-xs">Failed to send. Please try again.</p>
      )}
      {status === "captcha" && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-2">
          <p className="text-yellow-400 text-xs mb-1">
            The form requires CAPTCHA verification on the official site.
          </p>
          <a
            href="https://www.crm.com.mk/mk/za-tsrrsm/kontakt"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 text-xs underline hover:text-indigo-300"
          >
            Complete submission on crm.com.mk →
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

export default function InstitutionModal({ institution, onClose }) {
  const details = INSTITUTION_DETAILS[institution.slug];

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!details) return null;

  const mapSrc = `https://maps.google.com/maps?q=${details.mapQuery}&output=embed&z=15`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h3 className="text-white font-semibold">{institution.name}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{details.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Google Maps */}
          <div className="rounded-xl overflow-hidden border border-gray-800 h-48">
            <iframe
              title="map"
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Address", value: details.address },
              { label: "Phone", value: details.phone },
              { label: "Email", value: details.email },
              { label: "Working Hours", value: details.workingHours },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/50 rounded-lg px-4 py-3">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className="text-white text-sm">{value}</p>
              </div>
            ))}
          </div>

          {/* Uslugi contact form */}
          {institution.slug === "uslugi" && (
            <div className="border-t border-gray-800 pt-5">
              <UslugiContactForm />
            </div>
          )}

          {/* Mojtermin contact form */}
          {institution.slug === "mojtermin" && (
            <div className="border-t border-gray-800 pt-5">
              <ContactForm onClose={onClose} />
            </div>
          )}

          {/* CRM contact form */}
          {institution.slug === "crm" && (
            <div className="border-t border-gray-800 pt-5">
              <CrmContactForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
