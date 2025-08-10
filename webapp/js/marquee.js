
const YIndex = 1;

export function getItemPositions({
	columnCount,
	radius,
	rowCount,
	rowHeight,
	rowOffset,
} ) {
	const result = [];
	const rowPositionYList = getRowPositionYList(rowCount, rowHeight, rowOffset);

	for (let i = 0; i < rowCount; i++) {
		const isEvenRow = i % 2 === 0 ? true : false;
		const stepAngle = getStepAngle(columnCount);
		const itemPositions = getItemPositionsInRow(
			columnCount,
			radius,
			isEvenRow ? 0 : stepAngle / 2
		);
		result[i] = itemPositions.map<Position3D>((position) => {
			position[YIndex] = rowPositionYList[i];
			return position;
		});
	}

	return result;
}

export function getRowPositionYList(
	rowCount ,
	rowHeight ,
	rowOffset = 0
) {
	const result  = [];
	const totalHeight = rowHeight * rowCount + rowOffset * (rowCount - 1);
	const centerPositionY = totalHeight / 2;

	for (let i = 0; i < rowCount; i++) {
		const positionY =
			i * rowHeight +
			Math.max(0, rowOffset * i) -
			centerPositionY +
			rowHeight / 2;
			
		result.push(positionY);
	}

	return result;
}

export function getItemPositionsInRow(
	columnCount,
	radius,
	offset = 0 
) {
	const result= [];
	const stepAngle = getStepAngle(columnCount);

	for (let i = 0; i < columnCount; i++) {
		const itemAngle = stepAngle * i + offset;
		const position = getItemPositionInCircle(itemAngle, radius);
		result.push(position);
	}

	return result;
}

export function getStepAngle(columnCount) {
	return (Math.PI * 2) / columnCount;
}

export function getItemPositionInCircle(
	angle,
	radius
)  {
	return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}