import { newWorkshop } from "../../shared/workshop";
export const privateWorkshop = () => ({
  ...newWorkshop(),
  name: "La cancha de Ana",
  start: { x: 0, z: 0 },
  cup: { x: 0, z: -3, height: 0 },
  par: 5,
});

export function longWorkshop() {
  const d = newWorkshop();
  d.name = "El drive del taller";
  d.par = 4;
  d.start = { x: 0, z: 20 };
  d.cup = { x: 0, z: -17, height: 0 };
  d.pieces[0] = { ...d.pieces[0], width: 22, length: 44 };
  return d;
}
