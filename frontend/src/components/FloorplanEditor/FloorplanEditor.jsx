import { useState, useRef, useEffect, useCallback } from "react";
import {
  Paper,
  Group,
  Stack,
  Button,
  Text,
  NumberInput,
  Select,
  Grid,
  Card,
  Divider,
  Accordion,
  Tooltip,
  Badge,
  Alert,
  MultiSelect,
} from "@mantine/core";

const MATERIALS = [
  { value: "brick", label: "Brick" },
  { value: "concrete", label: "Concrete" },
  { value: "wood", label: "Wood" },
  { value: "insulated", label: "Insulated" },
  { value: "glass", label: "Glass" },
];

const WINDOW_MATERIALS = [
  { value: "single_glazed", label: "Single Glazed" },
  { value: "double_glazed", label: "Double Glazed" },
  { value: "triple_glazed", label: "Triple Glazed" },
  { value: "low_e", label: "Low-E Glass" },
];

const DOOR_MATERIALS = [
  { value: "wood", label: "Wood (Solid)" },
  { value: "wood_hollow", label: "Wood (Hollow)" },
  { value: "steel", label: "Steel" },
  { value: "fiberglass", label: "Fiberglass" },
  { value: "glass", label: "Glass Door" },
];

const SEALING = [
  { value: "poor", label: "Poor" },
  { value: "average", label: "Average" },
  { value: "good", label: "Good" },
  { value: "excellent", label: "Excellent" },
];

// Conversion: 1 foot = 0.3048 meters
const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 3.28084;

const SNAP_DISTANCE = 15; // pixels
const SCALE = 15; // pixels per foot
const ANGLE_SNAP_THRESHOLD = 10; // degrees - snap to right angles within this threshold

export default function FloorplanEditor({ floorplan, onChange }) {
  const [selectedWall, setSelectedWall] = useState(null);
  const [dragging, setDragging] = useState(null); // { wallId, endpoint: 'start' | 'end' }
  const svgRef = useRef(null);

  const width = 600;
  const height = 400;

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // calculate resistance and U-value of the floor (includes both the floor
  // constrution material and the material used for flooring like blankets
  // and carpets)
  const [flooringResistance, setFlooringResistance] = useState([]);

  const calcTotalResistance = (resistanceArr) => {
    setFlooringResistance(resistanceArr);
    const RValue = resistanceArr.map(Number);
    const floorResistance = 1 / 1.8; //default base is 1.8 (u value of concrete)
    const totalFloorResistance =
      RValue.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0,
      ) + floorResistance;
    const floor_u_value = { u_value: 1 / totalFloorResistance };

    onChange({
      ...floorplan,
      floor: { ...floorplan.floor, ...floor_u_value },
    });
  };

  // Calculate wall length in feet
  const getWallLength = (wall) => {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Find wall endpoints for snapping
  const getSnapPoints = (excludeWallId) => {
    const points = [];
    (floorplan.walls || []).forEach((wall) => {
      if (wall.id !== excludeWallId) {
        points.push({ x: wall.x1, y: wall.y1, wallId: wall.id });
        points.push({ x: wall.x2, y: wall.y2, wallId: wall.id });
      }
    });
    return points;
  };

  // Find nearest snap point
  const findSnapPoint = (x, y, excludeWallId) => {
    const snapPoints = getSnapPoints(excludeWallId);
    let nearest = null;
    let minDist = SNAP_DISTANCE / SCALE;

    snapPoints.forEach((point) => {
      const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    });

    return nearest;
  };

  // Soft-snap to axis alignment (snap X or Y independently if close to another endpoint)
  const AXIS_SNAP_THRESHOLD = 0.3; // feet - snap to aligned X/Y within this distance
  const snapToAxis = (x, y, excludeWallId) => {
    const snapPoints = getSnapPoints(excludeWallId);
    let snappedX = x;
    let snappedY = y;
    let xSnapped = false;
    let ySnapped = false;

    snapPoints.forEach((point) => {
      // Check X axis alignment
      if (!xSnapped && Math.abs(point.x - x) < AXIS_SNAP_THRESHOLD) {
        snappedX = point.x;
        xSnapped = true;
      }
      // Check Y axis alignment
      if (!ySnapped && Math.abs(point.y - y) < AXIS_SNAP_THRESHOLD) {
        snappedY = point.y;
        ySnapped = true;
      }
    });

    return { x: snappedX, y: snappedY, xSnapped, ySnapped };
  };

  // Snap to right angles (0, 90, 180, 270 degrees)
  const snapToRightAngle = (x, y, anchorX, anchorY) => {
    const dx = x - anchorX;
    const dy = y - anchorY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 0.5) return { x, y }; // Too short to snap

    // Calculate current angle in degrees
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Snap to nearest 90 degree angle
    const snapAngles = [0, 90, 180, -90, -180];
    let snappedAngle = angle;

    for (const snapAngle of snapAngles) {
      if (Math.abs(angle - snapAngle) < ANGLE_SNAP_THRESHOLD) {
        snappedAngle = snapAngle;
        break;
      }
    }

    // Convert back to coordinates
    const radians = snappedAngle * (Math.PI / 180);
    return {
      x: anchorX + length * Math.cos(radians),
      y: anchorY + length * Math.sin(radians),
    };
  };

  // Check if room is closed (all endpoints connect)
  const isRoomClosed = () => {
    const walls = floorplan.walls || [];
    if (walls.length < 3) return false;

    const endpoints = [];
    walls.forEach((wall) => {
      endpoints.push({
        x: wall.x1,
        y: wall.y1,
        wallId: wall.id,
        type: "start",
      });
      endpoints.push({ x: wall.x2, y: wall.y2, wallId: wall.id, type: "end" });
    });

    // Each endpoint should connect to exactly one other endpoint
    const tolerance = 0.5;
    let unconnected = 0;

    endpoints.forEach((ep) => {
      const connected = endpoints.some(
        (other) =>
          other.wallId !== ep.wallId &&
          Math.abs(other.x - ep.x) < tolerance &&
          Math.abs(other.y - ep.y) < tolerance,
      );
      if (!connected) unconnected++;
    });

    return unconnected === 0;
  };

  // Calculate floor area using shoelace formula with proper polygon tracing
  const calculateFloorArea = () => {
    const walls = floorplan.walls || [];
    if (walls.length < 3) return 0;
    if (!isRoomClosed()) return 0;

    // Build ordered polygon by tracing connected walls
    const tolerance = 0.5;
    const vertices = [];
    const usedWalls = new Set();

    // Start with first wall
    let currentWall = walls[0];
    let currentPoint = { x: currentWall.x1, y: currentWall.y1 };
    vertices.push(currentPoint);
    usedWalls.add(currentWall.id);
    let nextPoint = { x: currentWall.x2, y: currentWall.y2 };

    // Trace through connected walls
    while (usedWalls.size < walls.length) {
      vertices.push(nextPoint);

      // Find next connected wall
      const nextWall = walls.find((w) => {
        if (usedWalls.has(w.id)) return false;
        // Check if either endpoint connects
        return (
          (Math.abs(w.x1 - nextPoint.x) < tolerance &&
            Math.abs(w.y1 - nextPoint.y) < tolerance) ||
          (Math.abs(w.x2 - nextPoint.x) < tolerance &&
            Math.abs(w.y2 - nextPoint.y) < tolerance)
        );
      });

      if (!nextWall) break;

      usedWalls.add(nextWall.id);

      // Determine which endpoint to use next
      if (
        Math.abs(nextWall.x1 - nextPoint.x) < tolerance &&
        Math.abs(nextWall.y1 - nextPoint.y) < tolerance
      ) {
        nextPoint = { x: nextWall.x2, y: nextWall.y2 };
      } else {
        nextPoint = { x: nextWall.x1, y: nextWall.y1 };
      }
    }

    if (vertices.length < 3) return 0;

    // Shoelace formula
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    area = Math.abs(area) / 2;

    return area;
  };

  // Manually sync floor/ceiling area (called on save, not during drag to avoid shaking)
  const syncFloorCeilingArea = useCallback(() => {
    const area = calculateFloorArea();
    if (area > 0) {
      const areaM2 = parseFloat(
        (area * FEET_TO_METERS * FEET_TO_METERS).toFixed(2),
      );
      onChange({
        ...floorplan,
        floor: { ...floorplan.floor, area: areaM2 },
        ceiling: { ...floorplan.ceiling, area: areaM2 },
      });
    }
  }, [floorplan, onChange, calculateFloorArea]);

  const addWall = () => {
    const walls = floorplan.walls || [];
    let startX = 2,
      startY = 2;

    // If there are existing walls, start from the last endpoint
    if (walls.length > 0) {
      const lastWall = walls[walls.length - 1];
      startX = lastWall.x2;
      startY = lastWall.y2;
    }

    const newWall = {
      id: generateId(),
      x1: startX,
      y1: startY,
      x2: startX + 10,
      y2: startY,
      height: 9, // feet (about 2.7m)
      thickness: 9 / 12, // feet (9 inches default)
      material: "brick",
    };

    onChange({
      ...floorplan,
      walls: [...walls, newWall],
    });
  };

  const addWindow = (wallId) => {
    const newWindow = {
      id: generateId(),
      wall_id: wallId,
      position: 0.5,
      width: 4, // feet
      height: 4.5, // feet
      u_value: 2.8,
      sealing: "average",
      material: "double_glazed",
    };
    onChange({
      ...floorplan,
      windows: [...(floorplan.windows || []), newWindow],
    });
  };

  const addDoor = (wallId) => {
    const newDoor = {
      id: generateId(),
      wall_id: wallId,
      position: 0.3,
      width: 3, // feet
      height: 7, // feet
      u_value: 2.0,
      sealing: "average",
      material: "wood",
    };
    onChange({
      ...floorplan,
      doors: [...(floorplan.doors || []), newDoor],
    });
  };

  const updateWindow = (windowId, updates) => {
    onChange({
      ...floorplan,
      windows: floorplan.windows.map((w) =>
        w.id === windowId ? { ...w, ...updates } : w,
      ),
    });
  };

  const deleteWindow = (windowId) => {
    onChange({
      ...floorplan,
      windows: floorplan.windows.filter((w) => w.id !== windowId),
    });
  };

  const updateDoor = (doorId, updates) => {
    onChange({
      ...floorplan,
      doors: floorplan.doors.map((d) =>
        d.id === doorId ? { ...d, ...updates } : d,
      ),
    });
  };

  const deleteDoor = (doorId) => {
    onChange({
      ...floorplan,
      doors: floorplan.doors.filter((d) => d.id !== doorId),
    });
  };

  const updateWall = (wallId, updates) => {
    onChange({
      ...floorplan,
      walls: floorplan.walls.map((w) =>
        w.id === wallId ? { ...w, ...updates } : w,
      ),
    });
  };

  const updateWallLength = (wallId, newLength) => {
    const wall = floorplan.walls.find((w) => w.id === wallId);
    if (!wall) return;

    const currentLength = getWallLength(wall);
    if (currentLength === 0) return;

    const ratio = newLength / currentLength;
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;

    updateWall(wallId, {
      x2: wall.x1 + dx * ratio,
      y2: wall.y1 + dy * ratio,
    });
  };

  const deleteWall = (wallId) => {
    onChange({
      ...floorplan,
      walls: floorplan.walls.filter((w) => w.id !== wallId),
      windows: floorplan.windows?.filter((w) => w.wall_id !== wallId) || [],
      doors: floorplan.doors?.filter((d) => d.wall_id !== wallId) || [],
    });
    setSelectedWall(null);
  };

  const updateFloorCeiling = (type, updates) => {
    onChange({
      ...floorplan,
      [type]: { ...floorplan[type], ...updates },
    });
  };

  const updateVentilation = (updates) => {
    onChange({
      ...floorplan,
      ventilation: { ...floorplan.ventilation, ...updates },
    });
  };

  // Mouse event handlers for dragging
  const getSvgCoords = (e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / SCALE,
      y: (e.clientY - rect.top) / SCALE,
    };
  };

  const handleMouseDown = (e, wallId, endpoint) => {
    e.stopPropagation();
    setDragging({ wallId, endpoint });
    setSelectedWall(wallId);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;

    const coords = getSvgCoords(e);
    const wall = floorplan.walls.find((w) => w.id === dragging.wallId);
    if (!wall) return;

    // Get anchor point (the other end of the wall)
    const anchorX = dragging.endpoint === "start" ? wall.x2 : wall.x1;
    const anchorY = dragging.endpoint === "start" ? wall.y2 : wall.y1;

    let finalX = coords.x;
    let finalY = coords.y;

    // Calculate angle and check if close to right angle
    const dx = coords.x - anchorX;
    const dy = coords.y - anchorY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Check if near a right angle (0, 90, 180, -90)
    const snapAngles = [0, 90, 180, -90, -180];
    let isRightAngle = false;
    let snappedAngle = angle;

    for (const snapAngle of snapAngles) {
      if (Math.abs(angle - snapAngle) < ANGLE_SNAP_THRESHOLD) {
        snappedAngle = snapAngle;
        isRightAngle = true;
        break;
      }
    }

    if (isRightAngle && length >= 0.5) {
      // Snap to right angle
      const radians = snappedAngle * (Math.PI / 180);
      finalX = anchorX + length * Math.cos(radians);
      finalY = anchorY + length * Math.sin(radians);
    }

    // Check for endpoint snap (highest priority)
    const snapPoint = findSnapPoint(finalX, finalY, dragging.wallId);
    if (snapPoint) {
      finalX = snapPoint.x;
      finalY = snapPoint.y;
    }

    if (dragging.endpoint === "start") {
      updateWall(dragging.wallId, { x1: finalX, y1: finalY });
    } else {
      updateWall(dragging.wallId, { x2: finalX, y2: finalY });
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      // Sync floor/ceiling area when done dragging
      syncFloorCeilingArea();
    }
    setDragging(null);
  };

  const roomClosed = isRoomClosed();
  const floorAreaSqFt = calculateFloorArea();
  const floorAreaSqM = floorAreaSqFt * FEET_TO_METERS * FEET_TO_METERS;

  return (
    <Grid>
      {/* SVG Canvas */}
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper withBorder p="md">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <Text fw={500}>Floorplan Canvas</Text>
              {roomClosed ? (
                <Badge color="green" variant="light">
                  Room Closed ✓
                </Badge>
              ) : (
                <Badge color="orange" variant="light">
                  Room Open
                </Badge>
              )}
            </Group>
            <Button size="xs" variant="light" onClick={addWall}>
              + Add Wall
            </Button>
          </Group>

          <svg
            ref={svgRef}
            width={width}
            height={height}
            style={{
              background: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: 8,
              cursor: dragging ? "grabbing" : "default",
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid */}
            {Array.from({ length: Math.floor(width / SCALE) + 1 }).map(
              (_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * SCALE}
                  y1={0}
                  x2={i * SCALE}
                  y2={height}
                  stroke={i % 5 === 0 ? "#ced4da" : "#e9ecef"}
                  strokeWidth={i % 5 === 0 ? 1 : 0.5}
                />
              ),
            )}
            {Array.from({ length: Math.floor(height / SCALE) + 1 }).map(
              (_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i * SCALE}
                  x2={width}
                  y2={i * SCALE}
                  stroke={i % 5 === 0 ? "#ced4da" : "#e9ecef"}
                  strokeWidth={i % 5 === 0 ? 1 : 0.5}
                />
              ),
            )}

            {/* Walls */}
            {floorplan.walls?.map((wall) => {
              const isSelected = selectedWall === wall.id;
              const length = getWallLength(wall).toFixed(1);

              return (
                <g key={wall.id}>
                  {/* Wall line */}
                  <line
                    x1={wall.x1 * SCALE}
                    y1={wall.y1 * SCALE}
                    x2={wall.x2 * SCALE}
                    y2={wall.y2 * SCALE}
                    stroke={isSelected ? "#228be6" : "#495057"}
                    strokeWidth={isSelected ? 10 : 8}
                    strokeLinecap="round"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedWall(wall.id)}
                  />

                  {/* Length label */}
                  <text
                    x={((wall.x1 + wall.x2) / 2) * SCALE}
                    y={((wall.y1 + wall.y2) / 2) * SCALE - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#495057"
                  >
                    {length} ft
                  </text>

                  {/* Drag handles */}
                  <circle
                    cx={wall.x1 * SCALE}
                    cy={wall.y1 * SCALE}
                    r={isSelected ? 8 : 6}
                    fill={isSelected ? "#228be6" : "#adb5bd"}
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={(e) => handleMouseDown(e, wall.id, "start")}
                  />
                  <circle
                    cx={wall.x2 * SCALE}
                    cy={wall.y2 * SCALE}
                    r={isSelected ? 8 : 6}
                    fill={isSelected ? "#228be6" : "#adb5bd"}
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={(e) => handleMouseDown(e, wall.id, "end")}
                  />

                  {/* Windows */}
                  {floorplan.windows
                    ?.filter((w) => w.wall_id === wall.id)
                    .map((win) => {
                      const dx = wall.x2 - wall.x1;
                      const dy = wall.y2 - wall.y1;
                      const cx = (wall.x1 + dx * win.position) * SCALE;
                      const cy = (wall.y1 + dy * win.position) * SCALE;
                      return (
                        <circle
                          key={win.id}
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill="#74c0fc"
                          stroke="#228be6"
                          strokeWidth={2}
                        />
                      );
                    })}

                  {/* Doors */}
                  {floorplan.doors
                    ?.filter((d) => d.wall_id === wall.id)
                    .map((door) => {
                      const dx = wall.x2 - wall.x1;
                      const dy = wall.y2 - wall.y1;
                      const cx = (wall.x1 + dx * door.position) * SCALE;
                      const cy = (wall.y1 + dy * door.position) * SCALE;
                      return (
                        <rect
                          key={door.id}
                          x={cx - 8}
                          y={cy - 8}
                          width={16}
                          height={16}
                          fill="#b2f2bb"
                          stroke="#40c057"
                          strokeWidth={2}
                          rx={2}
                        />
                      );
                    })}
                </g>
              );
            })}
          </svg>

          <Text size="xs" c="dimmed" mt="xs">
            1 grid = 1 foot (5 grid lines = 5 ft). Drag endpoints to position
            walls. Endpoints snap to nearby walls.
          </Text>

          {!roomClosed && floorplan.walls?.length > 0 && (
            <Alert color="yellow" mt="sm" variant="light">
              Connect all wall endpoints to close the room for accurate
              simulation.
            </Alert>
          )}
        </Paper>
      </Grid.Col>

      {/* Properties Panel */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Card withBorder>
          <Accordion defaultValue="walls">
            {/* Walls */}
            <Accordion.Item value="walls">
              <Accordion.Control>
                Walls ({floorplan.walls?.length || 0})
              </Accordion.Control>
              <Accordion.Panel>
                {selectedWall ? (
                  <Stack gap="xs">
                    {(() => {
                      const wall = floorplan.walls?.find(
                        (w) => w.id === selectedWall,
                      );
                      if (!wall)
                        return (
                          <Text c="dimmed" size="sm">
                            Wall not found
                          </Text>
                        );

                      const length = getWallLength(wall);
                      const wallWindows =
                        floorplan.windows?.filter(
                          (w) => w.wall_id === wall.id,
                        ) || [];
                      const wallDoors =
                        floorplan.doors?.filter((d) => d.wall_id === wall.id) ||
                        [];

                      return (
                        <>
                          <NumberInput
                            label="Length (ft)"
                            value={parseFloat(length.toFixed(1))}
                            onChange={(v) => updateWallLength(wall.id, v)}
                            step={0.5}
                            min={1}
                            decimalScale={1}
                          />
                          <NumberInput
                            label="Height (ft)"
                            value={wall.height}
                            onChange={(v) => updateWall(wall.id, { height: v })}
                            step={0.5}
                            min={1}
                            max={30}
                          />
                          <NumberInput
                            label="Thickness (inches)"
                            value={(wall.thickness || 8) * 12}
                            onChange={(v) =>
                              updateWall(wall.id, { thickness: v / 12 })
                            }
                            step={1}
                            min={2}
                            max={24}
                            description="Wall thickness affects heat loss"
                          />
                          <Select
                            label="Material"
                            data={MATERIALS}
                            value={wall.material}
                            onChange={(v) =>
                              updateWall(wall.id, { material: v })
                            }
                          />
                          <Group grow>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => addWindow(wall.id)}
                            >
                              + Window
                            </Button>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => addDoor(wall.id)}
                            >
                              + Door
                            </Button>
                          </Group>

                          {/* Windows on this wall */}
                          {wallWindows.length > 0 && (
                            <>
                              <Divider label="Windows" labelPosition="center" />
                              {wallWindows.map((win, idx) => (
                                <Card
                                  key={win.id}
                                  withBorder
                                  padding="xs"
                                  bg="blue.0"
                                >
                                  <Text size="xs" fw={500} mb="xs">
                                    Window {idx + 1}
                                  </Text>
                                  <Group grow mb="xs">
                                    <NumberInput
                                      label="Width (ft)"
                                      value={win.width}
                                      onChange={(v) =>
                                        updateWindow(win.id, { width: v })
                                      }
                                      step={0.5}
                                      min={0.5}
                                      size="xs"
                                    />
                                    <NumberInput
                                      label="Height (ft)"
                                      value={win.height}
                                      onChange={(v) =>
                                        updateWindow(win.id, { height: v })
                                      }
                                      step={0.5}
                                      min={0.5}
                                      size="xs"
                                    />
                                  </Group>
                                  <Select
                                    label="Glass Type"
                                    data={WINDOW_MATERIALS}
                                    value={win.material || "double_glazed"}
                                    onChange={(v) =>
                                      updateWindow(win.id, { material: v })
                                    }
                                    size="xs"
                                    mb="xs"
                                  />
                                  <Select
                                    label="Sealing"
                                    data={SEALING}
                                    value={win.sealing}
                                    onChange={(v) =>
                                      updateWindow(win.id, { sealing: v })
                                    }
                                    size="xs"
                                    mb="xs"
                                  />
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() => deleteWindow(win.id)}
                                  >
                                    Remove
                                  </Button>
                                </Card>
                              ))}
                            </>
                          )}

                          {/* Doors on this wall */}
                          {wallDoors.length > 0 && (
                            <>
                              <Divider label="Doors" labelPosition="center" />
                              {wallDoors.map((door, idx) => (
                                <Card
                                  key={door.id}
                                  withBorder
                                  padding="xs"
                                  bg="green.0"
                                >
                                  <Text size="xs" fw={500} mb="xs">
                                    Door {idx + 1}
                                  </Text>
                                  <Group grow mb="xs">
                                    <NumberInput
                                      label="Width (ft)"
                                      value={door.width}
                                      onChange={(v) =>
                                        updateDoor(door.id, { width: v })
                                      }
                                      step={0.5}
                                      min={0.5}
                                      size="xs"
                                    />
                                    <NumberInput
                                      label="Height (ft)"
                                      value={door.height}
                                      onChange={(v) =>
                                        updateDoor(door.id, { height: v })
                                      }
                                      step={0.5}
                                      min={0.5}
                                      size="xs"
                                    />
                                  </Group>
                                  <Select
                                    label="Material"
                                    data={DOOR_MATERIALS}
                                    value={door.material || "wood"}
                                    onChange={(v) =>
                                      updateDoor(door.id, { material: v })
                                    }
                                    size="xs"
                                    mb="xs"
                                  />
                                  <Select
                                    label="Sealing"
                                    data={SEALING}
                                    value={door.sealing}
                                    onChange={(v) =>
                                      updateDoor(door.id, { sealing: v })
                                    }
                                    size="xs"
                                    mb="xs"
                                  />
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() => deleteDoor(door.id)}
                                  >
                                    Remove
                                  </Button>
                                </Card>
                              ))}
                            </>
                          )}

                          <Divider my="xs" />
                          <Button
                            color="red"
                            size="xs"
                            variant="light"
                            onClick={() => deleteWall(wall.id)}
                          >
                            Delete Wall
                          </Button>
                        </>
                      );
                    })()}
                  </Stack>
                ) : (
                  <Text c="dimmed" size="sm">
                    Click a wall to edit, drag endpoints to position
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>

            {/* Floor & Ceiling */}
            <Accordion.Item value="floor-ceiling">
              <Accordion.Control>Floor & Ceiling</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Alert color="blue" variant="light" mb="xs">
                    Area auto-calculated: {floorAreaSqFt.toFixed(1)} sq ft (
                    {floorAreaSqM.toFixed(1)} m²)
                  </Alert>

                  <Text fw={500} size="sm">
                    Floor
                  </Text>
                  <Tooltip
                    label="U-value measures thermal transmittance. Lower values mean better insulation. Typical: Ground floor 0.25-0.5, Suspended floor 0.2-0.3"
                    multiline
                    w={250}
                  >
                    <NumberInput
                      label="U-value (W/m²·K)"
                      description="Lower = better insulation. Default 1.8 which is the U-value of Cement."
                      value={floorplan.floor?.u_value || 0.5}
                      onChange={(v) =>
                        updateFloorCeiling("floor", { u_value: v })
                      }
                      step={0.1}
                      min={0.1}
                      max={5}
                      decimalScale={2}
                    />
                  </Tooltip>
                  <Tooltip label="add tooltip here" multiline w={250}>
                    <MultiSelect
                      label="Material Used for Flooring"
                      placeholder="Pick material(s)"
                      data={[
                        //value = resistance of the material.
                        { value: "0.29", label: "EPE Foam (10mm)" },
                        { value: "0.30", label: "Wool Carpet (15mm)" },
                        { value: "0.42", label: "Wool Blankets (15mm)" },
                        { value: "0.25", label: "Wood Flooring (Deodar 30mm)" },
                        { value: "0.05", label: "Laminate Wood (HDF 8mm)" },
                      ]}
                      value={flooringResistance}
                      onChange={(valueArr) => calcTotalResistance(valueArr)}
                    />
                  </Tooltip>

                  <Divider my="xs" />

                  <Text fw={500} size="sm">
                    Ceiling
                  </Text>
                  <Tooltip
                    label="U-value measures thermal transmittance. Lower values mean better insulation. Typical: Well-insulated roof 0.15-0.25, Uninsulated 1.0+"
                    multiline
                    w={250}
                  >
                    <NumberInput
                      label="U-value (W/m²·K)"
                      description="Lower = better insulation"
                      value={floorplan.ceiling?.u_value || 0.3}
                      onChange={(v) =>
                        updateFloorCeiling("ceiling", { u_value: v })
                      }
                      step={0.1}
                      min={0.1}
                      max={5}
                      decimalScale={2}
                    />
                  </Tooltip>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Ventilation */}
            <Accordion.Item value="ventilation">
              <Accordion.Control>Ventilation</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Tooltip
                    label="How many times the room's air volume is replaced per hour. Typical: 0.5 for airtight homes, 1-2 for older buildings"
                    multiline
                    w={250}
                  >
                    <NumberInput
                      label="Air Changes per Hour (ACH)"
                      description="Times air is replaced hourly"
                      value={floorplan.ventilation?.air_changes_per_hour || 0.5}
                      onChange={(v) =>
                        updateVentilation({ air_changes_per_hour: v })
                      }
                      step={0.1}
                      min={0}
                      max={10}
                      decimalScale={1}
                    />
                  </Tooltip>

                  <Tooltip
                    label="Additional mechanical exhaust (e.g., bathroom fans, kitchen hoods). This air is extracted and replaced with outdoor air, causing heat loss."
                    multiline
                    w={250}
                  >
                    <NumberInput
                      label="Exhaust Rate (m³/h)"
                      description="Mechanical ventilation extraction"
                      value={floorplan.ventilation?.exhaust_rate || 0}
                      onChange={(v) => updateVentilation({ exhaust_rate: v })}
                      step={10}
                      min={0}
                    />
                  </Tooltip>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
