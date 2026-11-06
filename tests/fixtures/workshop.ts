import { newWorkshop } from "../../shared/workshop";
export const privateWorkshop = () => ({
  ...newWorkshop(),
  name: "La cancha de Ana",
  start: { x: 0, z: 0 },
  cup: { x: 0, z: -3, height: 0 },
  par: 5,
});
