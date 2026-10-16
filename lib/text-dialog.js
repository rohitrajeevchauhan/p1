let dialogCounter = 0;

export function requestText({
  label,
  required = false,
  minLength = required ? 3 : 0,
  maxLength = 2000,
}) {
  if (typeof document === "undefined") return Promise.resolve(null);
  const returnFocus = document.activeElement;
  const hindi = document.documentElement.lang === "hi";
  const id = `coserve-dialog-${(dialogCounter += 1)}`;
  const dialog = document.createElement("dialog");
  dialog.className = "coserve-dialog";
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  const form = document.createElement("form");
  form.method = "dialog";
  const title = document.createElement("h2");
  title.id = `${id}-title`;
  title.textContent = label;
  const fieldLabel = document.createElement("label");
  fieldLabel.htmlFor = `${id}-value`;
  fieldLabel.textContent = label;
  const input = document.createElement("textarea");
  input.id = `${id}-value`;
  input.required = required;
  input.minLength = minLength;
  input.maxLength = maxLength;
  const validation = document.createElement("p");
  validation.className = "field-error";
  validation.setAttribute("role", "alert");
  const actions = document.createElement("div");
  actions.className = "form-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "secondary-button";
  cancel.textContent = hindi ? "रद्द करें" : "Cancel";
  const confirm = document.createElement("button");
  confirm.type = "submit";
  confirm.className = "primary-button";
  confirm.textContent = hindi ? "जारी रखें" : "Continue";
  actions.append(cancel, confirm);
  form.append(title, fieldLabel, input, validation, actions);
  dialog.append(form);
  document.body.append(dialog);
  return new Promise((resolve) => {
    const finish = (value) => {
      dialog.close();
      dialog.remove();
      if (returnFocus instanceof HTMLElement) returnFocus.focus();
      resolve(value);
    };
    cancel.addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if ((required && !value) || value.length < minLength) {
        validation.textContent = hindi
          ? `कम से कम ${minLength} अक्षर लिखें।`
          : `Enter at least ${minLength} characters.`;
        input.focus();
        return;
      }
      finish(value || "");
    });
    dialog.showModal();
    input.focus();
  });
}
