export function submitHostedCheckout(checkout: { action: string; fields: Record<string, string> }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.action;
  form.acceptCharset = "UTF-8";
  form.hidden = true;
  for (const [name, value] of Object.entries(checkout.fields)) {
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = name;
    field.value = value;
    form.append(field);
  }
  document.body.append(form);
  form.submit();
  form.remove();
}
