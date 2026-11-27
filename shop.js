async function openTokenShop() {
  const dialog = document.getElementById("token-shop");
  const message = document.getElementById("shop-status");
  const history = document.getElementById("shop-history");
  const buttons = [...dialog.querySelectorAll("[data-tokens]")];
  const login = document.getElementById("shop-login");
  const request = Symbol();
  dialog.shopRequest = request;
  const active = () =>
    dialog.open && dialog.shopRequest === request && currentUser?.id === owner;
  const owner = currentUser?.id;
  history.replaceChildren();
  buttons.forEach((button) => (button.disabled = true));
  login.hidden = !!owner;
  message.textContent = owner
    ? "Загрузка условий оплаты…"
    : "Войдите, чтобы купить токены для своего аккаунта.";
  if (!dialog.open) dialog.showModal();
  if (!owner) return;
  try {
    const orders = await sb
      .from("token_orders")
      .select("id,tokens,amount_kzt,paid_at,failed_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!active()) return;
    if (orders.error) throw Error();
    message.textContent =
      "Оплата через Freedom Pay. Один токен пополняет баланс на один кредит.";
    for (const order of orders.data) {
      const row = document.createElement("p");
      row.textContent =
        order.tokens +
        " токенов · " +
        order.amount_kzt +
        " ₸ · " +
        (order.paid_at
          ? "Зачислено"
          : order.failed_at
            ? "Оплата отклонена"
            : "Ожидает подтверждения") +
        " · " +
        order.id;
      history.append(row);
    }
    buttons.forEach((button) => {
      button.disabled = false;
      button.onclick = async () => {
        buttons.forEach((item) => (item.disabled = true));
        try {
          const { data, error } = await sb.functions.invoke("freedom-shop", {
            body: { tokens: Number(button.dataset.tokens) },
          });
          if (error || !data?.url) throw Error();
          if (active()) window.location.assign(data.url);
        } catch {
          if (active())
            message.textContent =
              "Платёжная страница недоступна. Попробуйте позже.";
        } finally {
          if (active()) buttons.forEach((item) => (item.disabled = false));
        }
      };
    });
    await loadUserProfile();
    if (active()) updateCreditsUI();
  } catch {
    if (active())
      message.textContent = "Магазин временно недоступен. Попробуйте позже.";
  }
}
